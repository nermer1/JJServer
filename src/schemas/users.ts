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
        default: function (this: {name: string}): string {
            return this.name;
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
    deleted: {type: String, default: ''},
    settings: {type: settingsSchema, default: () => ({})}
});

// 유저 정보가 업데이트되면(역할 등) 캐시를 강제로 비워 무중단 갱신을 유도합니다.
userSchemaDefinition.post('save', async function(doc) {
    if (doc && doc.email) {
        const PermissionCacheService = (await import('../service/PermissionCacheService.js')).default;
        await PermissionCacheService.clearUserCache(doc.email);
    }
});

userSchemaDefinition.post('findOneAndUpdate', async function(doc) {
    if (doc && doc.email) {
        const PermissionCacheService = (await import('../service/PermissionCacheService.js')).default;
        await PermissionCacheService.clearUserCache(doc.email);
    }
});

const Users = new UserSchema('users', userSchemaDefinition);

export {Users};
