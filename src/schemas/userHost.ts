import {CustomSchema} from './CustomSchema.js';

class UserHostSchema extends CustomSchema {
    constructor(schemaName: string, options: {} = {}) {
        super(schemaName, options);
    }
}

const UserHost = new UserHostSchema('userHost', {
    USER_ID: {
        required: true,
        unique: true,
        type: String
    },
    USER_HOST: {
        required: true,
        type: String
    }
});

export {UserHost};
