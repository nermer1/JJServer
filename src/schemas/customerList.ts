import CommonSchema from './CommonSchema.js';
import {validatorUtil as validator} from '../utils/UnietangUtils.js';
import ApiReturn from '../structure/ApiReturn.js';

class CustomerSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async getOptList(params: DBParamsType) {
        const option = params.option || {};
        const apiReturn = new ApiReturn();
        const returnData = (await this.model.find(option, {code: 1, text: 1, 'etc.otp': 1, _id: 0})).reduce((arr, data) => {
            const otpArr = data.etc.otp;
            if (otpArr.length != 0) {
                arr.push({
                    otp: data.etc.otp,
                    customer: {
                        code: data.code,
                        text: data.text
                    }
                });
            }
            return arr;
        }, [] as ObjAny);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }
}

/**
 * team: 1~4팀
 * code: 업체 식별자
 * text: 업체명
 * type: 타입1 운영유지보수, 타입2 하자유지보수, 타입3 계약기간동안 운영유지보수
 */

const CustomerList = new CustomerSchema('customer', {
    team: {
        type: String
    },
    code: {
        unique: true,
        required: true,
        type: String
    },
    text: {
        required: true,
        type: String
    },
    type: {
        required: true,
        type: String,
        enum: ['M', 'S', 'R']
    },
    ssh: {
        type: String
    },
    etc: {
        otp: [
            {
                secret: {type: String, required: true},
                mobile: {type: String, required: true},
                user: {type: String, required: true}
            }
        ],
        unidocu: {
            mobile: {type: String},
            version: {type: String}
        },
        pc: [
            {
                type: {
                    type: String,
                    required: true
                },
                hostname: {
                    type: String,
                    required: true
                },
                ip: {
                    type: String,
                    required: true,
                    validate: {
                        validator: (value: string) => validator.isIPv4(value),
                        message: 'IPv4 validation failed'
                    }
                },
                mac: {
                    type: String,
                    validate: {
                        validator: (value: string) => validator.isMacAddress(value),
                        message: 'Mac Address validation failed'
                    }
                }
            }
        ],
        version_control: {
            type: {type: String, enum: ['git', 'svn']},
            scope: {type: String, enum: ['internal', 'external']}
        }
    }
});

export {CustomerList};
