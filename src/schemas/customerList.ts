import CommonSchema from './CommonSchema.js';

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
    }
});

export {CustomerList};
