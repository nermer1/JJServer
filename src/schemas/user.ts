import CommonSchema from './CommonSchema.js';
import {validatorUtil as validator} from '../utils/UnietangUtils.js';

class UserSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
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

const Users = new UserSchema('users', {
    USER_NAME: {required: true, type: String},
    USER_BIRTH: {type: String},
    USER_HOSTNAME: {type: String, default: ''},
    USER_ID: {required: true, type: String},
    USER_JOINUS: {type: String},
    USER_MAIL: {
        required: true,
        type: String,
        validate: {
            validator: (value: string) => validator.isEmail(value),
            message: 'Email validation failed'
        }
    },
    USER_NICKNAME: {
        type: String,
        default: function (this: {USER_NAME: string}): string {
            return this.USER_NAME;
        }
    },
    USER_PHONE: {
        unique: true,
        type: String,
        validate: {
            validator: (value: string) => validator.isPhone(value),
            message: 'phone numver validation failed'
        }
    },
    USER_POSISTION: {required: true, type: String},
    USER_GROUP: {required: true, type: String},
    USER_ROLE: {required: true, type: String, default: 'basic'},
    DEL_FLAG: {type: String, default: ''}
});

export {Users};
