import CommonSchema from './CommonSchema.js';
import { Schema } from 'mongoose';

class PointHistorySchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const pointHistorySchemaDefinition = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    point: { type: Number, required: true }, // 증감치 (+10, -5 등)
    reason: { type: String, required: true }, // '출석', '업적 달성: 최초 로그인' 등
    relatedId: { type: Schema.Types.ObjectId, default: null }, // 필요시 관련된 특정 도큐먼트 ID 연결 (e.g. 업적 ID)
    createdAt: { type: Date, default: Date.now },
});

const PointHistories = new PointHistorySchema('pointHistories', pointHistorySchemaDefinition);

export { PointHistories };
