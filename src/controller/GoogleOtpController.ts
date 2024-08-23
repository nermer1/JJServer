import {Request, Response, NextFunction} from 'express';
import googleOtpService from '../service/GoogleOtpService.js';

class GoogleOtpController {
    public getList(req: Request, res: Response): void {
        const {customer} = req.body;
        res.json(googleOtpService.getList(customer));
    }
}

export default new GoogleOtpController();
