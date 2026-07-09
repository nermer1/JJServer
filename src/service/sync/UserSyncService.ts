import {BaseSyncService} from './BaseSyncService.js';
import {Users} from '../../schemas/users.js';
import {Department} from '../../schemas/department.js';
import {SlackMessenger} from '../../messenger/slack/SlackMessenger.js';
import SystemSettingsCacheService from '../../service/SystemSettingsCacheService.js';
import {basicProperty} from '../../properties/ServerProperty.js';

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

export class UserSyncService extends BaseSyncService<HrApiUser> {
    protected get apiUrl(): string {
        return SystemSettingsCacheService.getRequired('HR_API_USERS_URL');
    }
    protected model = Users.model;
    protected serviceName = '유저(인사) 동기화';

    private readonly SYNC_RULES = {
        excludedFields: ['extension'], // slackId는 동기화 대상에 포함되도록 제외 목록에서 제거
        fallbacks: {
            position: '없음',
            title: '없음'
        } as Record<string, string>
    };

    /**
     * 유저 동기화 메인 매핑 로직
     */
    protected async buildBulkOps(externalData: HrApiUser[]): Promise<any[]> {
        // 1. 부서 코드를 _id(ObjectId)로 매핑하기 위해 DB에서 최신 부서 목록을 가져옵니다.
        const departments = await Department.model.find({}).lean();
        const deptMap = new Map(departments.map((d: any) => [d.code, d._id]));

        // 2. 슬랙에서 전체 유저 목록을 가져와 이메일 -> 슬랙ID 맵(Map)을 생성합니다.
        const slackMap = new Map<string, string>();
        try {
            const slackMessenger = new SlackMessenger(SystemSettingsCacheService.get('SLACK_TOKEN', ''));
            const allSlackUsers = await slackMessenger.getUserList();
            allSlackUsers.forEach((user) => {
                if (user.profile?.email && user.id) {
                    slackMap.set(user.profile.email.toLowerCase(), user.id);
                }
            });
        } catch (error) {
            console.error('[UserSyncService] 슬랙 유저 목록을 가져오는 데 실패했습니다 (슬랙 동기화 패스):', error);
        }

        const bulkOps = externalData.map((emp) => {
            // 퇴사자 판별
            const isResigned = emp.user_show_yn === 'N' || !!emp.retire_date;

            // 퇴사자는 완전 삭제
            if (isResigned) {
                return {
                    deleteOne: {
                        filter: {email: emp.us_mail1}
                    }
                };
            }

            // 부서 ObjectId 매핑
            const deptObjectId = deptMap.get(emp.dept_id) || null;

            // 슬랙 ID 결정 (HR 데이터에 없으면 슬랙에서 긁어온 Map에서 이메일로 찾아서 매핑!)
            const empEmail = emp.us_mail1 ? emp.us_mail1.toLowerCase() : '';
            const resolvedSlackId = emp.slack_id || (empEmail ? slackMap.get(empEmail) : null);

            // 1차 매핑
            const mappedData: Record<string, any> = {
                userId: emp.us_id,
                name: emp.us_name,
                email: emp.us_mail1,
                position: emp.us_pos_name,
                title: emp.us_roll_name,
                slackId: resolvedSlackId,
                department_id: deptObjectId
            };

            const setPayload: Record<string, any> = {};

            // 규칙에 따른 필터링 (공란 대체, 예외 필드 무시)
            for (const [key, value] of Object.entries(mappedData)) {
                if (this.SYNC_RULES.excludedFields.includes(key)) {
                    continue;
                }

                if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                    if (this.SYNC_RULES.fallbacks[key] !== undefined) {
                        setPayload[key] = this.SYNC_RULES.fallbacks[key];
                    }
                    continue;
                }

                setPayload[key] = value;
            }

            return {
                updateOne: {
                    filter: {email: emp.us_mail1},
                    update: {
                        $set: setPayload,
                        $setOnInsert: {
                            nickname: emp.us_name
                        }
                    },
                    upsert: true
                }
            };
        });

        return bulkOps;
    }
}
