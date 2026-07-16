import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class AuditLogSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async findAll(params: any) {
        // 1. 공통 findAll 로직을 태워 원본 AuditLog 목록을 가져옵니다.
        const apiReturn = await super.findAll(params);
        let logs = apiReturn.getTableData();

        if (!Array.isArray(logs) || logs.length === 0) {
            return apiReturn;
        }

        // Mongoose Document 객체를 일반 JavaScript 객체로 변환하여 수정이 가능하게 만듭니다.
        logs = logs.map((log: any) => (log.toObject ? log.toObject() : log));

        // 2. 현재 조회된 모든 로그들의 userId 목록 추출 (중복 제거)
        const userIds = [...new Set(logs.map((log: any) => log.userId).filter(Boolean))];

        if (userIds.length > 0) {
            // 순환 참조 방지를 위해 동적 import 사용
            const {schemas} = await import('./schemaMap.js');

            // 3. 추출한 userId들(이메일 또는 슬랙아이디)로 Users 테이블을 한 번에 뒤집니다 (N+1 쿼리 방지)
            const users = await schemas.users.model
                .find({
                    $or: [{email: {$in: userIds}}, {slackId: {$in: userIds}}]
                })
                .select('email name slackId')
                .lean();

            // 매칭 속도를 높이기 위한 딕셔너리(Map) 구조화
            const userMapByEmail: Record<string, any> = {};
            const userMapBySlackId: Record<string, any> = {};

            users.forEach((u: any) => {
                if (u.email) userMapByEmail[u.email] = u;
                if (u.slackId) userMapBySlackId[u.slackId] = u;
            });

            // 4. 로그 리스트를 순회하며 이메일 및 이름 정보 주입 (Mapping)
            logs.forEach((log: any) => {
                let matchedUser = null;

                if (log.category === 'SLACK' && log.userId && log.userId.startsWith('U')) {
                    // 슬랙 아이디인 경우
                    matchedUser = userMapBySlackId[log.userId];
                    if (matchedUser) {
                        log.userId = matchedUser.email; // 원본 슬랙 ID를 이메일로 덮어씌움
                    }
                } else {
                    // 일반 이메일인 경우
                    matchedUser = userMapByEmail[log.userId];
                }

                // 매칭된 유저가 있으면 이름을 넣고, 없으면 기본값 표기
                log.userName = matchedUser ? matchedUser.name : log.userId === 'SYSTEM' ? '시스템' : '알 수 없음';
            });
        }

        // 5. 가공된 데이터를 다시 ApiReturn 구조체에 덮어씌워서 반환
        apiReturn.setTableData(logs);
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

