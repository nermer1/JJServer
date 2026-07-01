import CommonSchema from './CommonSchema.js';
import {validatorUtil as validator} from '../utils/Utils.js';
import {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn.js';

class UserSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async findAll(params: DBParamsType) {
        params = params || {};
        const option = params.option || {};
        const apiReturn = new ApiReturn();
        const returnData = await this.model.find(option).populate('department_id');

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }

    async insert(params: DBParamsType) {
        await this.validateRoleHierarchy(params);
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        await this.validateRoleHierarchy(params);
        return super.update(params);
    }

    /**
     * 권한 부여 시 하극상(Privilege Escalation)을 방지하는 로직
     */
    private async validateRoleHierarchy(params: DBParamsType) {
        let inputData: any = params.data.tableData;
        if (Array.isArray(inputData)) inputData = inputData[0];

        // 권한 수정 요청이 아니면 패스
        if (!inputData || !inputData.roles) return;

        const reqUser = (params as any).reqUser;
        // 시스템 내부 호출이거나 토큰 파싱 전이면 통과
        if (!reqUser || reqUser.level === undefined) return;

        // 방어 로직: 최고 관리자(system:admin) 권한이 없는 일반 사용자가
        // 포스트맨 등으로 API를 찔러서 roles(권한) 필드를 임의로 수정하려고 하면,
        // 해당 필드를 아예 무시(삭제)하여 취약점을 원천 차단합니다.
        if (!reqUser.permissions?.includes('system:admin')) {
            delete inputData.roles;
            return;
        }

        const {Role} = await import('./role.js');

        const targetRoles = await Role.model.find({_id: {$in: inputData.roles}}).lean();
        let targetMaxLevel = 0;
        targetRoles.forEach((r: any) => {
            if (r.level && r.level > targetMaxLevel) {
                targetMaxLevel = r.level;
            }
        });

        // 타겟 롤의 레벨이 내 레벨보다 "초과(>)"하면 에러 (동급은 허용)
        if (targetMaxLevel > reqUser.level) {
            throw new Error(`본인의 권한 레벨(${reqUser.level})을 초과하는 롤(Level: ${targetMaxLevel})은 부여할 수 없습니다.`);
        }
    }
}

/**
 * 유저 테이블 정보
 *
 * 이름
 * 생년월일
 * pc 호스트명
 * 아이디
 * 패스워드 - 기본값?
 * 입사일
 * 메일
 * 닉네임
 * 폰번호
 * 부서
 * 그룹
 * 권한
 * 퇴사 플래그 또는 퇴사일
 * 비밀번호 변경 플래그? 최초 로그인 시 비밀번호 변경을 위한 메일로 코드 발송?
 * 메일 수신 여부 플래그 세분화 여부 확인 필요
 * 당번
 *
 * 추가?
 * 포인트 - 로그인, 이벤트 등
 *
 * 업적 시스템?
 * 로그인 10회, 20회, 50회, 100회, 1000회 등
 * 입사일 n차 등
 * 생일자 알림
 */

const POSITION_LIST = ['매니저', '상무', '전무', '대표이사'];
const TITLE_LIST = ['없음', '팀장', '파트장', '그룹장', '부사장', '대표이사'];

const ipSchema = new Schema(
    {
        type: {type: String, required: true}, // 기기 종류 (예: desktop, mobile, ip_phone)
        name: {type: String, default: ''}, // 기기 별칭 (예: 개인 pc나 노트북 등)
        address: {type: String, required: true} // 할당된 IP 주소
    },
    {_id: false}
);

const settingsSchema = new Schema(
    {
        notifications: {
            slack: {
                otp: {type: [String], default: []}
            }
        },
        theme: {
            type: String,
            default: 'system'
        },
        colorTheme: {
            type: String,
            default: 'default'
        },
        favorites: {
            type: Object,
            default: {}
        }
    },
    {_id: false}
);

const userSchemaDefinition = new Schema({
    name: {required: true, type: String},
    birthDate: {type: String},
    hostname: {type: String, default: ''},
    userId: {required: true, type: String},
    slackId: {type: String, default: ''},
    createdAt: {type: String},
    email: {
        required: true,
        type: String,
        validate: {
            validator: (value: string) => validator.isEmail(value),
            message: 'Email validation failed'
        }
    },
    nickname: {
        type: String,
        default: function (this: any): string {
            return this && this.name ? this.name : '';
        }
    },
    extension: {
        type: String,
        default: ''
    },
    position: {
        required: true,
        type: String,
        enum: {
            values: POSITION_LIST,
            message: '{VALUE} is not supported'
        }
    },
    title: {
        type: String,
        enum: {
            values: TITLE_LIST,
            message: '{VALUE} is not supported'
        },
        default: '없음'
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department',
        default: null
    },
    roles: [
        {
            type: Schema.Types.ObjectId,
            ref: 'role'
        }
    ],
    ips: {type: [ipSchema], default: []},
    settings: {type: settingsSchema, default: () => ({})}
});

// 유저 정보가 업데이트되면(역할 등) 캐시를 강제로 비워 무중단 갱신을 유도합니다.
userSchemaDefinition.post('save', async function (doc) {
    if (doc && doc.email) {
        const PermissionCacheService = (await import('../service/PermissionCacheService.js')).default;
        await PermissionCacheService.clearUserCache(doc.email);
    }
});

userSchemaDefinition.post('findOneAndUpdate', async function (doc) {
    if (doc && doc.email) {
        const PermissionCacheService = (await import('../service/PermissionCacheService.js')).default;
        await PermissionCacheService.clearUserCache(doc.email);
    }
});

const Users = new UserSchema('users', userSchemaDefinition);

export {Users};
