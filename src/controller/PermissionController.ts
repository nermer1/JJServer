import {Request, Response} from 'express';
import PermissionSyncService from '../service/PermissionSyncService.js';

class PermissionController {
    /**
     * 권한을 강제로 동기화합니다.
     */
    async sync(req: Request, res: Response) {
        const userId = (req as any).user?.userId || 'SYSTEM';

        // 보안상 클라이언트가 던지는 Role을 무시하고, 백엔드에서 정적으로 하드코딩된 시스템 관리자에게만 동기화
        const result = await PermissionSyncService.syncAdminPermissions({ trigger: 'manual', userId });

        if (result.success) {
            res.status(200).json({success: true, message: result.message, data: result});
        } else {
            res.status(400).json({success: false, message: result.message, error: result.error});
        }
    }

    /**
     * API 키에 부여 가능한 안전한 권한 목록(isApiKeyAssignable: true)만 조회합니다.
     * 일반 유저도 API 키 발급 화면에서 호출할 수 있도록 genericCrudPermission 미들웨어를 우회합니다.
     */
    async getApiKeyScopes(req: Request, res: Response) {
        const {Permission} = await import('../schemas/permission.js');
        const scopes = await Permission.model.find({ isApiKeyAssignable: true })
            .select('_id action description isApiKeyAssignable')
            .lean();

        res.status(200).json({
            success: true,
            message: 'API Key 사용 가능 권한 목록 조회 성공',
            data: {
                tableData: scopes
            }
        });
    }
}

export default new PermissionController();

