import CommonSchema from './CommonSchema.js';
import mongoose, {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn.js';
import {validatorUtil as validator} from '../utils/UnietangUtils.js';

class CustomerSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
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
        defalut: '01'
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
                ip: {
                    type: String,
                    validate: {
                        validator: (value: string) => validator.isIPv4(value),
                        message: 'IPv4 validation failed'
                    }
                }
            }
        ]
    }
});

export {CustomerList};
