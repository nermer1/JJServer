import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class RoleSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const roleSchemaDefinition = new Schema({
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

// Role 정보가 업데이트되면 해당 Role을 가진 모든 유저의 캐시를 강제로 비워 무중단 갱신을 유도합니다.
roleSchemaDefinition.post('save', async function(doc) {
    if (doc && doc._id) {
        const PermissionCacheService = (await import('../service/PermissionCacheService.js')).default;
        await PermissionCacheService.clearCacheByRoleId(doc._id.toString());
    }
});

roleSchemaDefinition.post('findOneAndUpdate', async function(doc) {
    if (doc && doc._id) {
        const PermissionCacheService = (await import('../service/PermissionCacheService.js')).default;
        await PermissionCacheService.clearCacheByRoleId(doc._id.toString());
    }
});

const Role = new RoleSchema('role', roleSchemaDefinition);

export {Role};
