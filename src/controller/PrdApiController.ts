import {Request, Response, NextFunction} from 'express';
import prdApiService from '../service/PrdApiService.js';

class PrdApiController {
    public async call(req: Request, res: Response): Promise<void> {
        const params = req.body;
        const returnData = await prdApiService.call(params);
        res.json(returnData);
    }
}

export default new PrdApiController();
