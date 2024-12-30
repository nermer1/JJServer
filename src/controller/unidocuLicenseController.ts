import {Request, Response, NextFunction} from 'express';
import unidocuLicenseService from '../service/UnidocuLicenseService.js';

/* {
    status: number,
    message: string,
    data: any
} */

class UnidocuLicenseController {
    public getEncryptText(req: Request, res: Response): void {
        const {cryptoText} = req.body;
        res.json({data: unidocuLicenseService.getEncryptText(cryptoText)});
    }

    public getDecryptText(req: Request, res: Response): void {
        const {cryptoText} = req.body;
        res.json({data: unidocuLicenseService.getDecryptText(cryptoText)});
    }

    public getLicenseFile(req: Request, res: Response): void {
        unidocuLicenseService.getLicenseFile(req, res);
    }
}

export default new UnidocuLicenseController();
