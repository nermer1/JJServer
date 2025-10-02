import CommonSchema from './CommonSchema.js';

class PermissionSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const Permission = new PermissionSchema('permission', {
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

export {Permission};
