import {Request, Response} from 'express';
import systemService from '../service/SystemService.js';
import logger from '../utils/logger.js';
import ApiReturn from '../structure/ApiReturn.js';

class SystemController {
    public async getCombinedIps(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        try {
            const user = (req as any).user;
            const hasDetailPermission = user?.permissions?.includes('system:ip:read:any');

            const data = await systemService.getCombinedIpData(hasDetailPermission);
            apiReturn.setTableData(data);
            apiReturn.setReturnMessage('조회 성공');
        } catch (error: any) {
            logger.error(`[SystemController] getCombinedIps 오류: ${error.message}`);
            apiReturn.setReturnErrorMessage(error.message);
        }

        res.json(apiReturn);
    }
}

export default new SystemController();

