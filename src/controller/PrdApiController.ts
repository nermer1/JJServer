import {Request, Response, NextFunction} from 'express';
import prdApiService from '../service/PrdApiService.js';

class PrdApiController {
    public async call(req: Request, res: Response): Promise<void> {
        const collectionName = req.params.collection;
        const params = req.body;
        console.log(collectionName);
        console.log('req.cookies: ', req.cookies);
        console.log('req.cookies: ', req.cookies.token);
        console.log('req.headers: ', req.headers);
        console.log('req.headers: ', req.headers.authorization);
        const returnData = await prdApiService.call(collectionName, params);
        res.json(returnData);
    }
}

export default new PrdApiController();
