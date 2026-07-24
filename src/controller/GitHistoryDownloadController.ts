import {Request, Response, NextFunction} from 'express';
import gitHistoryDownloadService from '../service/GitHistoryDownloadService.js';
import {DBLogger} from '../utils/DBLogger.js';

interface RequestBody {
    projectId: string;
}

class GitHistoryDownloadController {
    public async getFileDownload(req: Request<{}, {}, RequestBody>, res: Response): Promise<void> {
        const {projectId} = req.body;
        
        const reqUser = (req as any).user;
        await DBLogger.log({
            category: 'FILE',
            action: 'Git History 파일 다운로드',
            target: projectId,
            actionType: 'EXECUTE',
            userId: reqUser?.userId || 'UNKNOWN',
            details: { projectId }
        });

        const fileName = projectId + '_gitlab-history.xlsx';
        const excelBuffer = await gitHistoryDownloadService.getExcelBuffer(req);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(excelBuffer);
    }
}

export default new GitHistoryDownloadController();
