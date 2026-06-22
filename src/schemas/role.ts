import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class RoleSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType) {
        await this.validateRoleLevel(params, 'insert');
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        await this.validateRoleLevel(params, 'update');
        return super.update(params);
    }

    async delete(params: DBParamsType) {
        await this.validateRoleLevel(params, 'delete');
        return super.delete(params);
    }

    private async validateRoleLevel(params: DBParamsType, action: 'insert' | 'update' | 'delete') {
        const reqUser = (params as any).reqUser;
        // 시스템 내부 호출이거나 토큰이 없으면 패스 (서버 초기 구동 시 등)
        if (!reqUser || reqUser.level === undefined) return;

        let inputData: any = params.data.tableData;
        if (Array.isArray(inputData)) inputData = inputData[0];
        if (!inputData) return;

        // 1. 새로 부여하려는 level이 내 level을 초과하는지 검사 (insert, update)
        if ((action === 'insert' || action === 'update') && inputData.level !== undefined) {
            if (inputData.level > reqUser.level) {
                throw new Error(`본인의 권한 레벨(${reqUser.level})을 초과하는 계급(${inputData.level})의 롤은 생성/수정할 수 없습니다.`);
            }
        }

        // 2. 기존 DB에 저장된 Role의 level이 내 level을 초과하는 롤을 수정/삭제하려는 경우 방어 (update, delete)
        if ((action === 'update' || action === 'delete') && inputData._id) {
            const existingRole = await this.model.findById(inputData._id).lean();
            if (existingRole && existingRole.level > reqUser.level) {
                throw new Error(`본인의 권한 레벨(${reqUser.level})을 초과하는 상위 롤(Level: ${existingRole.level})은 수정/삭제할 수 없습니다.`);
            }
        }
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
