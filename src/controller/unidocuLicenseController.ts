import {Request, Response, NextFunction} from 'express';
import licenseService from '../service/licenseService.js';

/* {
    status: number,
    message: string,
    data: any
} */

const controller = {
    getEncryptText: (req: Request, res: Response) => {
        res.json({data: licenseService.getEncryptText(req)});
    },
    getDecryptText: (req: Request, res: Response) => {
        res.json({data: licenseService.getDecryptText(req)});
    },
    getLicenseFile: async (req: Request, res: Response) => {
        /**
         * @todo data type 정의 필요
         */
        res.json({data: ''});
    }
};

export default controller;
