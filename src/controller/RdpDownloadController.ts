import {Request, Response, NextFunction} from 'express';
//import hypervService from '../service/hypervConnectedService.js';

class RdpDownloadController {
    public getFileDownload(req: Request, res: Response): void {
        const address = '192.168.12.196';
        res.setHeader('Content-Type', 'application/x-rdp');
        res.setHeader('Content-Disposition', 'attachment; filename=' + address + '.rdp');
        res.end('full address:s:' + address + ':3389\r\nprompt for credentials:i:1');
    }
}

export default new RdpDownloadController();
