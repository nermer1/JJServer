import {Request, Response, NextFunction} from 'express';
import otpService from '../service/OtpService.js';

class OtpController {
    public async getList(req: Request, res: Response): Promise<void> {
        const {customer} = req.body;
        res.json(await otpService.getList(customer));
    }
}

export default new OtpController();
