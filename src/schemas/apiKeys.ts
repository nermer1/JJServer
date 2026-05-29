import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class ApiKeySchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const ApiKeys = new ApiKeySchema('apiKeys', {
    key: {required: true, type: String, unique: true},
    userId: {required: true, type: String}, // API Key를 발급받은 유저의 ID
    name: {required: true, type: String}, // ex) 'Slack Webhook', 'A Company Server'
    isActive: {type: Boolean, default: true},
    createdAt: {type: Date, default: Date.now},
    lastUsedAt: {type: Date, default: null},
    permissions: [
        {
            type: Schema.Types.ObjectId,
            ref: 'permission'
        }
    ]
});

export {ApiKeys};

