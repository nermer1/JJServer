import {Request, Response} from 'express';
import crypto from 'crypto';
import prdApiService from '../service/PrdApiService.js';
import PermissionCacheService from '../service/PermissionCacheService.js';
import {DBLogger} from '../utils/DBLogger.js';
import logger from '../utils/logger.js';
import {Permission} from '../schemas/permission.js';
import ApiReturn from '../structure/ApiReturn.js';

class ApiKeyController {
    /**
     * 만능 라우터(PrdApiController)를 대체할 도메인 전용 핸들러
     * 프론트엔드의 /api/v1/prd/apiKeys 요청을 가로채어 처리합니다.
     */
    public async call(req: Request, res: Response): Promise<void> {
        const params = req.body;
        const reqUser = (req as any).user;
        (params as any).reqUser = reqUser; // 내부 로직 및 로깅을 위해 주입

        try {
            // 1. insert / update 시 API Key 데이터 주입 및 권한 검증 명시적 처리
            if (params.type === 'C' || params.type === 'U') {
                await this.prepareApiKeyData(params, reqUser);
                await this.validateApiKeyPermissions(params);
            }

            // 2. DB 비즈니스 로직 위임 (기존 PrdApiService 재사용)
            const returnData = await prdApiService.call('apiKeys', params);

            // 3. 작업 완료 후 명시적 훅(Hook) 캐시 처리 및 로깅
            if (params.type && params.type !== 'R') {
                const actionNameMap: Record<string, string> = {C: '생성', U: '수정', D: '삭제'};
                const actionTypeMap: Record<string, string> = {C: 'CREATE', U: 'UPDATE', D: 'DELETE'};

                await DBLogger.log({
                    category: 'DATA',
                    action: `apiKeys 데이터 ${actionNameMap[params.type] || params.type}`,
                    target: 'apiKeys',
                    actionType: actionTypeMap[params.type] || 'EXECUTE',
                    userId: reqUser?.userId || 'UNKNOWN',
                    details: params.data
                });

                // C, U, D 일 때 캐시 삭제 명시적 처리 (key 기준)
                // params.data.tableData 나 returnData 에서 key를 추출
                let targetKeys: string[] = [];
                const inputDataArray = Array.isArray(params.data.tableData) ? params.data.tableData : [params.data.tableData];

                for (const inputData of inputDataArray) {
                    if (inputData && inputData.key) {
                        targetKeys.push(inputData.key);
                    } else if (inputData && inputData._id) {
                        // DB에서 직접 조회해서 key를 알아냄
                        const {ApiKeys} = await import('../schemas/apiKeys.js');
                        const doc = await ApiKeys.model.findById(inputData._id).lean();
                        if (doc) targetKeys.push(doc.key);
                    }
                }

                if (targetKeys.length === 0 && returnData) {
                    const tableData = (returnData as any).getTableData ? (returnData as any).getTableData() : (returnData as any).tableData;
                    if (Array.isArray(tableData)) {
                        targetKeys = tableData.filter((t) => t && t.key).map((t) => t.key);
                    }
                }

                // 중복 제거 및 캐시 삭제
                targetKeys = [...new Set(targetKeys)];
                for (const key of targetKeys) {
                    await PermissionCacheService.clearApiKeyCache(key);
                    logger.info(`[ApiKeyController] API Key(${key}) 권한 캐시 리로드 완료`);
                }
            }

            res.json(returnData);
        } catch (error: any) {
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(error.message);
            logger.error(`[ApiKeyController] 에러 발생: ${error.message}`);
            res.json(apiReturn);
        }
    }

    /**
     * API Key 생성 시 보안 난수 및 발급자 정보를 강제 주입하고 권한 문자열을 치환합니다.
     */
    private async prepareApiKeyData(params: any, reqUser: any) {
        if (!params.data || !params.data.tableData) return;
        const dataList = Array.isArray(params.data.tableData) ? params.data.tableData : [params.data.tableData];

        for (const item of dataList) {
            // C(생성) 타입일 때만 난수 키와 발급자 주입
            if (params.type === 'C') {
                if (!item.key) {
                    item.key = `ak_${crypto.randomBytes(16).toString('hex')}`;
                }
                if (reqUser && reqUser.userId) {
                    item.userId = reqUser.userId;
                } else if (!item.userId) {
                    item.userId = 'unknown_user';
                }
            }

            // 권한(permissions) 배열에 문자열(action)이 있다면 ObjectId로 치환
            if (item.permissions && Array.isArray(item.permissions)) {
                const stringPerms = item.permissions.filter((p: any) => typeof p === 'string');
                if (stringPerms.length > 0) {
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

    /**
     * API Key 발급/수정 시 안전한 권한(isApiKeyAssignable: true)만 포함되어 있는지 명시적 검증
     */
    private async validateApiKeyPermissions(params: any) {
        let inputData: any = params.data?.tableData;
        if (!inputData) return;
        if (Array.isArray(inputData)) inputData = inputData[0];

        if (!inputData.permissions || !Array.isArray(inputData.permissions) || inputData.permissions.length === 0) {
            return;
        }

        // 권한 ID(ObjectId) 또는 문자열(action) 추출
        const permIds = inputData.permissions.filter((p: any) => typeof p !== 'string');
        const permStrings = inputData.permissions.filter((p: any) => typeof p === 'string');

        const query: any = {$or: []};
        if (permIds.length > 0) query.$or.push({_id: {$in: permIds}});
        if (permStrings.length > 0) query.$or.push({action: {$in: permStrings}});

        if (query.$or.length === 0) return;

        const foundPerms = await Permission.model.find(query).lean();

        for (const p of foundPerms) {
            if (p.isApiKeyAssignable !== true) {
                throw new Error(`보안 에러: 권한 '${p.action}' 은(는) API Key에 부여할 수 없습니다.`);
            }
        }
    }
}

export default new ApiKeyController();

