import {Request, Response, NextFunction} from 'express';
import prdApiService from '../service/PrdApiService.js';
import logger from '../utils/logger.js';

class PrdApiController {
    public async call(req: Request, res: Response): Promise<void> {
        try {
            const collectionName = req.params.collection;
            const params = req.body;
            logger.info('PrdApiController call', {collectionName, params});
            const returnData = await prdApiService.call(collectionName, params);
            res.json(returnData);
        } catch (error) {
            //res.json(returnData);
        }
    }
}

export default new PrdApiController();
