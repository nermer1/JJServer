import {Request, Response, NextFunction} from 'express';
import prdApiService from '../service/PrdApiService.js';
import logger from '../utils/logger.js';

class PrdApiController {
    public async call(req: Request, res: Response): Promise<void> {
        const collectionName = req.params.collection;
        const params = req.body;
        
        // 프론트엔드에서 보낸 순수 데이터만 먼저 깔끔하게 로깅
        logger.info('PrdApiController call', {collectionName, params});

        // 로깅이 끝난 후, 백엔드 스키마단 처리를 위해 유저 정보 은밀히 주입
        (params as any).reqUser = (req as any).user;

        const returnData = await prdApiService.call(collectionName, params);
        res.json(returnData);
    }
}

export default new PrdApiController();
