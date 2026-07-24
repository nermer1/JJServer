import CommonSchema from './CommonSchema.js';
import { Schema } from 'mongoose';

const levelPolicySchemaDef = new Schema({
    level: {
        type: Number,
        required: true,
        unique: true
    },
    requiredPoint: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// 기본 레벨 오름차순으로 정렬되게 인덱스 설정
levelPolicySchemaDef.index({ level: 1 });

class LevelPolicySchema extends CommonSchema {
    constructor(schemaName: string, options: any) {
        super(schemaName, options);
    }
}

const LevelPolicies = new LevelPolicySchema('levelPolicies', levelPolicySchemaDef);

export { LevelPolicies };
