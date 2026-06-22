import {Request, Response, NextFunction} from 'express';
import gitHistoryDownloadService from '../service/GitHistoryDownloadService.js';

interface RequestBody {
    projectId: string;
}

class GitHistoryDownloadController {
    public async getFileDownload(req: Request<{}, {}, RequestBody>, res: Response): Promise<void> {
        const {projectId} = req.body;
        const fileName = projectId + '_gitlab-history.xlsx';
        const excelBuffer = await gitHistoryDownloadService.getExcelBuffer(req);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(excelBuffer);
    }
}

export default new GitHistoryDownloadController();
