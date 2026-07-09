import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class RoleSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType) {
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        return super.update(params);
    }

    async delete(params: DBParamsType) {
        return super.delete(params);
    }
}

const roleSchemaDefinition = new Schema({
    name: {
        type: String,
        required: true,
        unique: true, // 역할 이름은 중복되면 안 됨
        description: "역할 이름 (e.g., 'ADMIN', 'EDITOR')"
    },
    level: {
        type: Number,
        required: true,
        default: 10,
        description: '역할 계급 (숫자가 높을수록 상위 권한)'
    },
    permissions: [
        {
            type: Schema.Types.ObjectId,
            ref: 'permission' // Permission 컬렉션을 참조
        }
    ]
});

const Role = new RoleSchema('role', roleSchemaDefinition);

export {Role};
