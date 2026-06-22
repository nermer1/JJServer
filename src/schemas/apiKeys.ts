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

    // CommonSchema의 insert를 가로채서 API Key 자동 생성 및 발급자 주입 로직 추가
    async insert(params: DBParamsType) {
        await this.validateApiKeyPermissions(params);
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

    async update(params: DBParamsType) {
        await this.validateApiKeyPermissions(params);
        return super.update(params);
    }

    /**
     * API Key 발급/수정 시 안전한 권한(isApiKeyAssignable: true)만 포함되어 있는지 DB 원천 검증
     */
    private async validateApiKeyPermissions(params: DBParamsType) {
        let inputData: any = params.data?.tableData;
        if (!inputData) return;
        if (Array.isArray(inputData)) inputData = inputData[0];

        if (!inputData.permissions || !Array.isArray(inputData.permissions) || inputData.permissions.length === 0) {
            return; // 권한 부여가 없으면 패스
        }

        const {Permission} = await import('./permission.js');

        // 권한 ID(ObjectId) 또는 문자열(action) 추출
        const permIds = inputData.permissions.filter((p: any) => typeof p !== 'string');
        const permStrings = inputData.permissions.filter((p: any) => typeof p === 'string');

        // DB에서 요청된 권한들을 실제로 조회
        const query: any = {$or: []};
        if (permIds.length > 0) query.$or.push({_id: {$in: permIds}});
        if (permStrings.length > 0) query.$or.push({action: {$in: permStrings}});

        if (query.$or.length === 0) return;

        const foundPerms = await Permission.model.find(query).lean();

        // 찾지 못한 권한이 있거나, API Key 할당이 금지된(isApiKeyAssignable: false) 권한이 섞여있다면 에러 뱉기
        for (const p of foundPerms) {
            if (p.isApiKeyAssignable !== true) {
                throw new Error(`보안 에러: 권한 '${p.action}' 은(는) API Key에 부여할 수 없습니다.`);
            }
        }
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
