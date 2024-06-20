import CommonSchema from './CommonSchema.js';
import ApiReturn from '../structure/ApiReturn.js';
import {validatorUtil as validator} from '../utils/UnietangUtils.js';

class CustomerSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async findAll(params?: DBParamsType) {
        const apiReturn = new ApiReturn();
        const returnData = await this.model.find({}).sort({text: 1});

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
        required: true,
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
    version: {
        required: true,
        type: String
    },
    mobile_flag: {
        type: String
    },
    ip: {
        type: String,
        required: true,
        validate: {
            validator: (value: string) => validator.isIPv4(value),
            message: 'IPv4 validation failed'
        }
    },
    ssh: {
        type: String,
        required: true,
        default: ''
    }
});

export {CustomerList};
