import logger from '../utils/logger.js';
import {Users} from '../schemas/users.js';
import {apiClient} from '../modules/httpClient/ApiClient.js';

/**
 * 외부 HR 시스템에서 받아온 인사 정보 인터페이스 (제공해주신 A 데이터 기준)
 */
interface HrApiUser {
    us_id: string;
    us_name: string;
    dept_id: string;
    dept_name: string;
    us_roll_name: string;
    us_pos_name: string;
    us_mail1: string;
    us_telno: string;
    slack_id: string | null;
    is_leader: boolean;
    enter_date: string | null;
    retire_date: string | null;
    emp_no: string | null;
    user_show_yn: string; // "Y" or "N"
}

/**
 * 외부 HR API를 호출하여 최신 인사 정보를 가져옵니다.
 */
async function fetchHrDataFromApi(): Promise<HrApiUser[]> {
    const url = 'http://192.168.12.211:4100/api/users';

    // apiClient를 통해 외부 API 호출
    const response = await apiClient.get<HrApiUser[]>(url, {
        params: {active_only: true}
    });

    if (!response.success) {
        logger.error(`HR API 호출 실패: ${response.error}`, response.details);
        return [];
    }

    return response.data;
}

// 인사 정보 동기화 처리 규칙 설정
const SYNC_RULES = {
    // DB 데이터에 절대로 덮어씌우지 않을 예외 필드 목록
    excludedFields: ['slackId', 'extension'],
    // 값이 비어있을 경우 대체할 기본값(Fallback)
    fallbacks: {
        position: '없음',
        title: '없음'
    } as Record<string, string>
};

/**
 * 인사 정보 동기화 배치 작업
 */
export const syncHrDataJob = async () => {
    try {
        logger.info('[배치] 인사 정보 동기화 시작...');

        // 1. 외부 HR API에서 최신 직원 목록 조회
        const hrUsers = await fetchHrDataFromApi();

        if (!hrUsers || hrUsers.length === 0) {
            logger.warn('[배치] 받아온 인사 정보가 없습니다.');
            return;
        }

        // 2. MongoDB bulkWrite를 위한 연산 배열 생성
        const bulkOps = hrUsers.map((emp) => {
            // 퇴사자 여부 판별 (user_show_yn이 N이거나 retire_date가 있을 경우 퇴사로 간주)
            const isResigned = emp.user_show_yn === 'N' || !!emp.retire_date;

            // 만약 퇴사자라면 DB에서 완전히 제거하는 연산(deleteOne) 반환
            if (isResigned) {
                return {
                    deleteOne: {
                        filter: {email: emp.us_mail1}
                    }
                };
            }

            // A(HR 데이터)를 B(내 서비스 스키마) 형태로 1차 매핑
            const mappedData: Record<string, any> = {
                userId: emp.us_id,
                name: emp.us_name,
                email: emp.us_mail1,
                position: emp.us_pos_name,
                title: emp.us_roll_name,
                slackId: emp.slack_id // 데이터가 null이어도 아래 로직에서 걸러짐
                // 부서 데이터가 텍스트/ID로 들어오기 때문에 나중에 부서 동기화 로직에 맞춰 수정 필요
                // department_id: emp.dept_id
            };

            const setPayload: Record<string, any> = {};

            // 1차 매핑된 데이터를 순회하며 불필요한 값 제거
            for (const [key, value] of Object.entries(mappedData)) {
                // [조건 1] 업데이트 제외 목록에 있는 필드인지 확인
                if (SYNC_RULES.excludedFields.includes(key)) {
                    continue;
                }

                // [조건 2] 공란(null, undefined, 빈 문자열) 처리
                if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                    // 대체할 기본값이 설정되어 있다면 기본값 적용
                    if (SYNC_RULES.fallbacks[key] !== undefined) {
                        setPayload[key] = SYNC_RULES.fallbacks[key];
                    }
                    continue; // 기본값이 없으면 무시
                }

                // 조건을 통과한 유효한 값만 최종 업데이트 객체에 담기
                setPayload[key] = value;
            }

            return {
                updateOne: {
                    filter: {email: emp.us_mail1}, // 이메일을 식별키로 사용
                    update: {
                        $set: setPayload,
                        $setOnInsert: {
                            nickname: emp.us_name // 신규 입사자 최초 생성 시에만 닉네임을 이름으로 세팅 (이후엔 덮어쓰지 않음)
                        }
                    },
                    upsert: true
                }
            };
        });

        // 3. 한 번에 DB 적용 (Upsert & Delete)
        const result = await Users.model.bulkWrite(bulkOps as any);

        logger.info(`[배치] 인사 정보 동기화 완료! (Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Deleted: ${result.deletedCount})`);
    } catch (error) {
        logger.error('[배치 오류] 인사 정보 동기화 중 에러 발생:', error);
    }
};

