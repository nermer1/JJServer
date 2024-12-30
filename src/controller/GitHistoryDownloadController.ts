import {Request, Response, NextFunction} from 'express';
import gitHistoryDownloadService from '../service/GitHistoryDownloadService.js';

class GitHistoryDownloadController {
    public async getFileDownload(req: Request, res: Response): Promise<void> {
        try {
            const {projectId} = req.body;
            const fileName = projectId + '_gitlab-history.xlsx';
            const excelBuffer = await gitHistoryDownloadService.getExcelBuffer(req);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(excelBuffer);
        } catch (e: any) {
            console.error('엑셀 파일 생성 중 에러 발생:', e.message);
            res.status(500).json({error: e.message});
        }
    }
}

export default new GitHistoryDownloadController();
