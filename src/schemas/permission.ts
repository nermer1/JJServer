import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class PermissionSchema extends CommonSchema {
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

const permissionSchemaDefinition = new Schema({
    action: {
        type: String,
        required: true,
        unique: true, // 권한은 중복되면 안 됨
        description: "권한 (e.g., 'article:create', 'user:manage')"
    },
    description: {
        type: String,
        description: '권한에 대한 설명'
    },
    isApiKeyAssignable: {
        type: Boolean,
        default: false,
        description: 'API Key 발급 시 부여 가능한 권한 여부'
    }
});

const Permission = new PermissionSchema('permission', permissionSchemaDefinition);

export {Permission};
