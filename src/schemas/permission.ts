import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class PermissionSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
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
    }
});

// permission이 새로 생성될 때 특정 role(기본: 'ADMIN')에 해당 권한을 자동 추가
permissionSchemaDefinition.post('save', async function(doc) {
    if (doc && doc._id) {
        // Role 컬렉션 동적 import (순환 참조 방지용)
        const {Role} = await import('./role.js');
        
        const TARGET_ROLE_NAME = 'ADMIN'; // 권한을 자동으로 부여할 역할 (필요시 변경)
        
        await Role.model.findOneAndUpdate(
            { name: TARGET_ROLE_NAME },
            { $addToSet: { permissions: doc._id } }
        );
    }
});

const Permission = new PermissionSchema('permission', permissionSchemaDefinition);

export {Permission};
