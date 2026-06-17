import {Request, Response} from 'express';
import PermissionSyncService from '../service/PermissionSyncService.js';

class PermissionController {
    /**
     * 권한을 강제로 동기화합니다.
     */
    async sync(req: Request, res: Response) {
        try {
            const targetRoleName = req.body.targetRoleName || 'SYSTEM_ADMIN';
            const result = await PermissionSyncService.syncAdminPermissions(targetRoleName);

            if (result.success) {
                res.status(200).json({success: true, message: result.message, data: result});
            } else {
                res.status(400).json({success: false, message: result.message, error: result.error});
            }
        } catch (error: any) {
            console.error('[PermissionController] sync Error:', error);
            res.status(500).json({success: false, message: 'Server error', error: error.message});
        }
    }
}

export default new PermissionController();

