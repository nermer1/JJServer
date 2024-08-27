import {Request, Response, NextFunction} from 'express';
import googleOtpService from '../service/GoogleOtpService.js';

class GoogleOtpController {
    public async getList(req: Request, res: Response): Promise<void> {
        const {customer} = req.body;
        res.json(await googleOtpService.getList(customer));
    }
}

export default new GoogleOtpController();
