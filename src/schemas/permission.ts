import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class PermissionSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType) {
        this.validateSystemAdmin(params);
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        this.validateSystemAdmin(params);
        return super.update(params);
    }

    async delete(params: DBParamsType) {
        this.validateSystemAdmin(params);
        return super.delete(params);
    }

    private validateSystemAdmin(params: DBParamsType) {
        const reqUser = (params as any).reqUser;
        // 시스템 내부 호출이거나 토큰이 없으면 패스
        if (!reqUser || reqUser.level === undefined) return;

        // 최고 관리자(레벨 100 이상)만 Permission(시스템 근간)을 수정/생성/삭제할 수 있음
        if (reqUser.level < 100) {
            throw new Error(`권한(Permission) 메타데이터는 최고 관리자(Level 100 이상)만 조작할 수 있습니다. (현재 레벨: ${reqUser.level})`);
        }
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
