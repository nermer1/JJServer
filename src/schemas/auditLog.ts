import CommonSchema from './CommonSchema.js';
import ApiReturn from '../structure/ApiReturn.js';
import {Schema} from 'mongoose';

class AuditLogSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async findAll(params: any) {
        // 프론트엔드에서 필터 파라미터를 option 객체에 담아 보낸다고 가정
        const option = params.option || {};

        // 1. 페이지네이션 파라미터 추출
        const page = Number(option.page) || 1;
        const limit = Number(option.limit) || 10;
        const skip = (page - 1) * limit;

        // 2. 동적 필터 쿼리 구성
        const filter: any = {};

        // 카테고리 검색 (전체가 아닐 경우)
        if (option.category && option.category !== '전체' && option.category !== '전체 카테고리') {
            filter.category = option.category;
        }

        // 상태 검색 (전체 상태가 아닐 경우)
        if (option.status && option.status !== '전체 상태' && option.status !== '전체') {
            filter.status = option.status;
        }

        // 기간 검색 (ISO String 포맷 기반)
        if (option.startDate || option.endDate) {
            filter.createdAt = {};
            if (option.startDate) filter.createdAt.$gte = new Date(option.startDate);
            if (option.endDate) filter.createdAt.$lte = new Date(option.endDate);
        }

        // 키워드 검색 (action 내용 또는 userId에 대한 부분 일치 검색)
        if (option.keyword) {
            filter.$or = [
                { action: { $regex: option.keyword, $options: 'i' } },
                { userId: { $regex: option.keyword, $options: 'i' } }
            ];
        }

        // 3. 전체 데이터 카운트 (페이지네이션 정보용)
        const totalCount = await this.model.countDocuments(filter);

        // 4. 페이징 및 필터가 적용된 최신 로그 데이터 조회
        let logs = await this.model.find(filter)
            .sort({ createdAt: -1 }) // 최신순 정렬
            .skip(skip)
            .limit(limit)
            .lean(); // toObject() 불필요, 순수 JS 객체 반환으로 속도 향상

        if (logs.length > 0) {
            // 5. 현재 조회된 로그들의 userId 목록 추출 (중복 제거)
            const userIds = [...new Set(logs.map((log: any) => log.userId).filter(Boolean))];

            if (userIds.length > 0) {
                // 순환 참조 방지를 위해 동적 import 사용
                const {schemas} = await import('./schemaMap.js');

                // 6. 추출한 userId들(이메일 또는 슬랙아이디)로 Users 테이블을 한 번에 조회
                const users = await schemas.users.model
                    .find({
                        $or: [{email: {$in: userIds}}, {slackId: {$in: userIds}}]
                    })
                    .select('email name slackId')
                    .lean();

                const userMapByEmail: Record<string, any> = {};
                const userMapBySlackId: Record<string, any> = {};

                users.forEach((u: any) => {
                    if (u.email) userMapByEmail[u.email] = u;
                    if (u.slackId) userMapBySlackId[u.slackId] = u;
                });

                // 7. 로그 리스트를 순회하며 이메일 및 이름 정보 주입
                logs.forEach((log: any) => {
                    let matchedUser = null;

                    if (log.category === 'SLACK' && log.userId && log.userId.startsWith('U')) {
                        matchedUser = userMapBySlackId[log.userId];
                        if (matchedUser) {
                            log.userId = matchedUser.email;
                        }
                    } else {
                        matchedUser = userMapByEmail[log.userId];
                    }

                    log.userName = matchedUser ? matchedUser.name : log.userId === 'SYSTEM' ? '시스템' : '알 수 없음';
                });
            }
        }

        // 8. ApiReturn 구조체에 데이터 및 페이징 정보 세팅
        const apiReturn = new ApiReturn();
        apiReturn.setTableData(logs);
        apiReturn.put('pagination', {
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit: limit
        });
        apiReturn.setReturnMessage('조회 성공');

        return apiReturn;
    }
}

const auditLogSchemaDefinition = new Schema(
    {
        category: {
            type: String,
            required: true,
            enum: ['SLACK', 'SYNC', 'USER', 'SYSTEM', 'OTHER', 'DATA', 'FILE'],
            description: '로그 대분류'
        },
        action: {
            type: String,
            required: true,
            description: '구체적 행위 내용 (예: /otp 명령어 호출)'
        },
        target: {
            type: String,
            default: 'N/A',
            description: '대상이 되는 컬렉션이나 타겟 (예: users, role)'
        },
        actionType: {
            type: String,
            default: 'EXECUTE',
            description: '행위 분류 코드 (CREATE, UPDATE, DELETE, EXECUTE, LOGIN 등)'
        },
        userId: {
            type: String,
            default: 'SYSTEM',
            description: '행위자 식별자 (Slack User ID, 이메일 등)'
        },
        details: {
            type: Schema.Types.Mixed,
            default: {},
            description: '요청 바디 등 상세 메타 데이터'
        },
        status: {
            type: String,
            required: true,
            enum: ['SUCCESS', 'FAIL', 'PENDING'],
            default: 'SUCCESS',
            description: '작업 성공 여부'
        }
    },
    {
        timestamps: true // createdAt, updatedAt 자동 생성
    }
);

const AuditLog = new AuditLogSchema('auditLog', auditLogSchemaDefinition);

export {AuditLog};

