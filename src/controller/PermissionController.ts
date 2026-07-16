import {Request, Response} from 'express';
import PermissionSyncService, {syncAdminPermissionsJob} from '../service/PermissionSyncService.js';
import prdApiService from '../service/PrdApiService.js';
import {DBLogger} from '../utils/DBLogger.js';
import logger from '../utils/logger.js';
import {Role} from '../schemas/role.js';
import ApiReturn from '../structure/ApiReturn.js';

class PermissionController {
    /**
     * 만능 라우터(PrdApiController)를 대체할 도메인 전용 핸들러
     * 프론트엔드의 /api/v1/prd/permission 요청을 가로채어 처리합니다.
     */
    public async call(req: Request, res: Response): Promise<void> {
        const params = req.body;
        const reqUser = (req as any).user;
        (params as any).reqUser = reqUser; // 내부 로직 및 로깅을 위해 주입

        try {
            // 1. 보안 검증 (최고 관리자 레벨 검증)
            if (['C', 'U', 'D'].includes(params.type)) {
                this.validateSystemAdmin(reqUser);
            }

            // 2. DB 비즈니스 로직 위임 (기존 PrdApiService 재사용)
            const returnData = await prdApiService.call('permission', params);

            // 3. 작업 완료 후 명시적 훅(Hook) 캐시 처리 및 로깅
            if (params.type && params.type !== 'R') {
                const actionNameMap: Record<string, string> = {C: '생성', U: '수정', D: '삭제'};
                const actionTypeMap: Record<string, string> = {C: 'CREATE', U: 'UPDATE', D: 'DELETE'};

                await DBLogger.log({
                    category: 'DATA',
                    action: `permission 데이터 ${actionNameMap[params.type] || params.type}`,
                    target: 'permission',
                    actionType: actionTypeMap[params.type] || 'EXECUTE',
                    userId: reqUser?.userId || 'UNKNOWN',
                    details: params.data
                });

                // 생성(C)의 경우 새 권한을 ADMIN 롤에 명시적으로 추가
                if (params.type === 'C') {
                    let newPermissionId = null;
                    const inputData = Array.isArray(params.data.tableData) ? params.data.tableData[0] : params.data.tableData;
                    if (inputData && inputData._id) {
                        newPermissionId = inputData._id;
                    } else if (returnData) {
                        const tableData = (returnData as any).getTableData ? (returnData as any).getTableData() : (returnData as any).tableData;
                        if (Array.isArray(tableData) && tableData.length > 0) {
                            newPermissionId = tableData[0]._id;
                        }
                    }

                    if (newPermissionId) {
                        const TARGET_ROLE_NAME = 'ADMIN';
                        await Role.model.findOneAndUpdate({name: TARGET_ROLE_NAME}, {$addToSet: {permissions: newPermissionId}});
                        logger.info(`[PermissionController] 새로 생성된 권한(${newPermissionId})을 ${TARGET_ROLE_NAME} 역할에 명시적으로 추가 완료`);
                    }
                }
            }

            res.json(returnData);
        } catch (error: any) {
            logger.error(`[PermissionController] 에러 발생: ${error.message}`);
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(error.message);
            res.json(apiReturn);
        }
    }

    /**
     * 권한(Permission) 메타데이터 조작은 최고 관리자만 가능하도록 제한
     */
    private validateSystemAdmin(reqUser: any) {
        if (!reqUser || reqUser.level === undefined) return;

        if (reqUser.level < 100) {
            throw new Error(`권한(Permission) 메타데이터는 최고 관리자(Level 100 이상)만 조작할 수 있습니다. (현재 레벨: ${reqUser.level})`);
        }
    }

    /**
     * 권한을 강제로 동기화합니다.
     */
    async sync(req: Request, res: Response) {
        const userId = (req as any).user?.userId || 'SYSTEM';
        const apiReturn = new ApiReturn();

        try {
            // 보안상 클라이언트가 던지는 Role을 무시하고, 백엔드에서 정적으로 하드코딩된 시스템 관리자에게만 동기화
            // 래핑된 Job을 호출하여 수동 실행 시에도 DB 로그가 자동 기록되게 함
            const result = await syncAdminPermissionsJob({trigger: 'manual', userId});

            if (result.success) {
                apiReturn.setReturnMessage(result.message);
                apiReturn.put('data', result);
            } else {
                apiReturn.setReturnMessage(result.message);
            }

            res.json(apiReturn);
        } catch (error: any) {
            apiReturn.setReturnErrorMessage('권한 동기화 중 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * API 키에 부여 가능한 안전한 권한 목록(isApiKeyAssignable: true)만 조회합니다.
     * 일반 유저도 API 키 발급 화면에서 호출할 수 있도록 genericCrudPermission 미들웨어를 우회합니다.
     */
    async getApiKeyScopes(req: Request, res: Response) {
        const {Permission} = await import('../schemas/permission.js');
        const scopes = await Permission.model.find({isApiKeyAssignable: true}).select('_id action description isApiKeyAssignable').lean();

        const apiReturn = new ApiReturn();
        apiReturn.setTableData(scopes);
        apiReturn.setReturnMessage('API Key 사용 가능 권한 목록 조회 성공');

        res.json(apiReturn);
    }
}

export default new PermissionController();
