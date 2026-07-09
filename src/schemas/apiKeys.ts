import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';
import PermissionCacheService from '../service/PermissionCacheService.js';
import ApiReturn from '../structure/ApiReturn.js';

import crypto from 'crypto';

class ApiKeySchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async findAll(params: DBParamsType) {
        params = params || {};
        const option = params.option || {};
        const apiReturn = new ApiReturn();

        // permissions 배열을 실제 Permission 문서로 치환(populate)하여 프론트엔드에서 action을 바로 볼 수 있게 함
        const returnData = await this.model.find(option).populate('permissions');

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }

    async insert(params: DBParamsType) {
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        return super.update(params);
    }
}

const apiKeyDefinition = new Schema({
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

const ApiKeys = new ApiKeySchema('apiKeys', apiKeyDefinition);

export {ApiKeys};
