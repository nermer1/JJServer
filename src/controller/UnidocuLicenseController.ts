import {Request, Response, NextFunction} from 'express';
import unidocuLicenseService from '../service/UnidocuLicenseService.js';
import {DBLogger} from '../utils/DBLogger.js';

/* {
    status: number,
    message: string,
    data: any
} */

class UnidocuLicenseController {
    public async getEncryptText(req: Request, res: Response): Promise<void> {
        const {plainText} = req.body;

        const reqUser = (req as any).user;
        await DBLogger.log({
            category: 'OTHER',
            action: 'Unidocu AES 암호화',
            target: 'unidocu_aes_encrypt',
            actionType: 'EXECUTE',
            userId: reqUser?.userId || 'UNKNOWN',
            details: { plainText }
        });

        res.json({data: unidocuLicenseService.getEncryptText(plainText)});
    }

    public async getDecryptText(req: Request, res: Response): Promise<void> {
        const {cryptoText} = req.body;

        const reqUser = (req as any).user;
        await DBLogger.log({
            category: 'OTHER',
            action: 'Unidocu AES 복호화',
            target: 'unidocu_aes_decrypt',
            actionType: 'EXECUTE',
            userId: reqUser?.userId || 'UNKNOWN',
            details: { cryptoText }
        });

        res.json({data: unidocuLicenseService.getDecryptText(cryptoText)});
    }

    public async getLicenseFile(req: Request, res: Response): Promise<void> {
        const reqUser = (req as any).user;
        await DBLogger.log({
            category: 'OTHER',
            action: 'Unidocu 라이선스 파일 발급',
            target: 'unidocu_license',
            actionType: 'EXECUTE',
            userId: reqUser?.userId || 'UNKNOWN',
            details: req.body
        });

        unidocuLicenseService.getLicenseFile(req, res);
    }
}

export default new UnidocuLicenseController();
