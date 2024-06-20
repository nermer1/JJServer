import {Request, Response, NextFunction} from 'express';
import gitHistoryDownloadService from '../service/GitHistoryDownloadService.js';

class GitHistoryDownloadController {
    public async getFileDownload(req: Request, res: Response): Promise<void> {
        const excelBuffer = await gitHistoryDownloadService.getExcelBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=gitlab-history.xlsx');
        res.send(excelBuffer);
    }
}

export default new GitHistoryDownloadController();
