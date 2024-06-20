import {Request, Response, NextFunction} from 'express';
import googleOtpService from '../service/GoogleOtpService.js';

class GoogleOtpController {
    public getList(req: Request, res: Response): void {
        const {option, customer} = req.body;
        res.json({data: googleOtpService.getList(option, customer)});
    }
}

export default new GoogleOtpController();
