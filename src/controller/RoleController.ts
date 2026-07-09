import {Request, Response} from 'express';
import prdApiService from '../service/PrdApiService.js';
import PermissionCacheService from '../service/PermissionCacheService.js';
import {DBLogger} from '../utils/DBLogger.js';
import logger from '../utils/logger.js';
import {Role} from '../schemas/role.js';
import ApiReturn from '../structure/ApiReturn.js';

class RoleController {
    /**
     * 만능 라우터(PrdApiController)를 대체할 도메인 전용 핸들러
     * 프론트엔드의 /api/v1/prd/role 요청을 가로채어 처리합니다.
     */
    public async call(req: Request, res: Response): Promise<void> {
        const params = req.body;
        const reqUser = (req as any).user;
        (params as any).reqUser = reqUser; // 내부 로직 및 로깅을 위해 주입

        try {
            // 1. 하극상 방지 로직 (마법 제거 및 명시적 처리)
            if (['C', 'U', 'D'].includes(params.type)) {
                const actionType = params.type === 'C' ? 'insert' : params.type === 'U' ? 'update' : 'delete';
                await this.validateRoleLevel(params, reqUser, actionType);
            }

            // 2. DB 비즈니스 로직 위임 (기존 PrdApiService 재사용)
            const returnData = await prdApiService.call('role', params);

            // 3. 작업 완료 후 명시적 훅(Hook) 캐시 처리 및 로깅
            if (params.type && params.type !== 'R') {
                const actionNameMap: Record<string, string> = {C: '생성', U: '수정', D: '삭제'};
                const actionTypeMap: Record<string, string> = {C: 'CREATE', U: 'UPDATE', D: 'DELETE'};

                await DBLogger.log({
                    category: 'DATA',
                    action: `role 데이터 ${actionNameMap[params.type] || params.type}`,
                    target: 'role',
                    actionType: actionTypeMap[params.type] || 'EXECUTE',
                    userId: reqUser?.userId || 'UNKNOWN',
                    details: params.data
                });

                // 명시적으로 Role과 연관된 모든 유저 캐시 삭제
                let targetRoleId = '';
                const inputData = Array.isArray(params.data.tableData) ? params.data.tableData[0] : params.data.tableData;
                if (inputData && inputData._id) {
                    targetRoleId = inputData._id;
                } else if (returnData) {
                    const tableData = (returnData as any).getTableData ? (returnData as any).getTableData() : (returnData as any).tableData;
                    if (Array.isArray(tableData) && tableData.length > 0) {
                        targetRoleId = tableData[0]._id;
                    }
                }

                if (targetRoleId) {
                    await PermissionCacheService.clearCacheByRoleId(targetRoleId.toString());
                    logger.info(`[RoleController] 롤(${targetRoleId}) 변경에 따른 연관 유저 권한 캐시 리로드 완료`);
                }
            }

            res.json(returnData);
        } catch (error: any) {
            logger.error(`[RoleController] 에러 발생: ${error.message}`);
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(error.message);
            res.json(apiReturn);
        }
    }

    /**
     * 계급(Level) 기반 하극상(Privilege Escalation)을 방지하는 명시적 로직
     */
    private async validateRoleLevel(params: any, reqUser: any, action: 'insert' | 'update' | 'delete') {
        if (!reqUser || reqUser.level === undefined) return;

        let inputData: any = params.data.tableData;
        if (Array.isArray(inputData)) inputData = inputData[0];
        if (!inputData) return;

        // 1. 새로 부여하려는 level이 내 level을 초과하는지 검사 (insert, update)
        if ((action === 'insert' || action === 'update') && inputData.level !== undefined) {
            if (inputData.level > reqUser.level) {
                throw new Error(`본인의 권한 레벨(${reqUser.level})을 초과하는 계급(${inputData.level})의 롤은 생성/수정할 수 없습니다.`);
            }
        }

        // 2. 기존 DB에 저장된 Role의 level이 내 level을 초과하는 롤을 수정/삭제하려는 경우 방어 (update, delete)
        if ((action === 'update' || action === 'delete') && inputData._id) {
            const existingRole = await Role.model.findById(inputData._id).lean();
            if (existingRole && existingRole.level > reqUser.level) {
                throw new Error(`본인의 권한 레벨(${reqUser.level})을 초과하는 상위 롤(Level: ${existingRole.level})은 수정/삭제할 수 없습니다.`);
            }
        }
    }
}

export default new RoleController();

