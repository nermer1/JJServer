import {CustomSchema} from './CustomSchema.js';

class UserSchema extends CustomSchema {
    constructor(schemaName: string, options: {} = {}) {
        super(schemaName, options);
    }
}

const Users = new UserSchema('users', {
    USER_NAME: {required: true, type: String},
    USER_BIRTH: {type: String},
    USER_HOSTNAME: {type: String, default: ''},
    USER_ID: {required: true, type: String},
    USER_JOINUS: {type: String},
    USER_MAIL: {required: true, unique: true, type: String},
    USER_NICKNAME: {type: String},
    USER_PHONE: {unique: true, type: String},
    USER_POSISTION: {required: true, type: String},
    USER_GROUP: {required: true, type: String},
    USER_ROLE: {required: true, type: String, default: 'basic'},
    DEL_FLAG: {type: String, default: ''}
});

export {Users};
