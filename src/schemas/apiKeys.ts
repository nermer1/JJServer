import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';
import PermissionCacheService from '../service/PermissionCacheService.js';

import crypto from 'crypto';

class ApiKeySchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    // CommonSchema의 insert를 가로채서 API Key 자동 생성 및 발급자 주입 로직 추가
    async insert(params: DBParamsType) {
        const currentUser = (params as any).reqUser; // PrdApiController에서 주입해준 정보

        if (params.data && Array.isArray(params.data.tableData)) {
            // await를 사용하기 위해 forEach 대신 for...of 사용
            for (const item of params.data.tableData) {
                // 1. 보안 난수 Key 자동 발급
                if (!item.key) {
                    item.key = `ak_${crypto.randomBytes(16).toString('hex')}`;
                }

                // 2. 발급자의 userId를 강제 주입 (보안)
                if (currentUser && currentUser.userId) {
                    item.userId = currentUser.userId;
                } else if (!item.userId) {
                    item.userId = 'unknown_user';
                }

                // 3. permissions에 문자열(action명)이 들어왔다면 ObjectId로 변환 처리
                if (item.permissions && Array.isArray(item.permissions)) {
                    const stringPerms = item.permissions.filter((p: any) => typeof p === 'string');
                    if (stringPerms.length > 0) {
                        // Permission 컬렉션 동적 import (순환 참조 방지용)
                        const {Permission} = await import('./permission.js');
                        const permDocs = await Permission.model.find({action: {$in: stringPerms}});

                        item.permissions = item.permissions
                            .map((p: any) => {
                                if (typeof p === 'string') {
                                    const found = permDocs.find((doc) => doc.action === p);
                                    return found ? found._id : null;
                                }
                                return p;
                            })
                            .filter(Boolean); // 찾지 못한 권한(null)은 제거
                    }
                }
            }
        }

        return super.insert(params);
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

// API Key 수정/삭제 시 Redis 캐시 실시간 삭제 (초기화)
const clearCache = async (doc: any) => {
    if (doc && doc.key) {
        await PermissionCacheService.clearApiKeyCache(doc.key);
    }
};

apiKeyDefinition.post('save', clearCache);
apiKeyDefinition.post('findOneAndUpdate', clearCache);
apiKeyDefinition.post('findOneAndDelete', clearCache);

const ApiKeys = new ApiKeySchema('apiKeys', apiKeyDefinition);

export {ApiKeys};
