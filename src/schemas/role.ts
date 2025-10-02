import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class RoleSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const Role = new RoleSchema('role', {
    name: {
        type: String,
        required: true,
        unique: true, // 역할 이름은 중복되면 안 됨
        description: "역할 이름 (e.g., 'ADMIN', 'EDITOR')"
    },
    permissions: [
        {
            type: Schema.Types.ObjectId,
            ref: 'permission' // Permission 컬렉션을 참조
        }
    ]
});

export {Role};
