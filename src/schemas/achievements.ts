import CommonSchema from './CommonSchema.js';
import { Schema } from 'mongoose';

class AchievementSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const achievementSchemaDefinition = new Schema({
    code: { type: String, required: true, unique: true }, // e.g., 'FIRST_API_KEY'
    title: { type: String, required: true }, // e.g., '개발자의 첫 걸음'
    description: { type: String, required: true }, // e.g., '최초로 API 키를 발급받았습니다.'
    conditionType: { type: String, required: true }, // e.g., 'API_KEY_COUNT'
    conditionValue: { type: Number, default: 1 }, // e.g., 1 (requires 1 API key)
    rewardPoint: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

const Achievements = new AchievementSchema('achievements', achievementSchemaDefinition);

export { Achievements };
