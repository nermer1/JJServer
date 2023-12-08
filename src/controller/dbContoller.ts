import {Request, Response, NextFunction} from 'express';
import dbService from '../service/dbService.js';

const controller = {
    call: async (req: Request, res: Response) => {
        const params = req.body;
        console.log('params ', params);
        const returnData = await dbService.call(params);
        res.json(returnData);
    }
};

export default controller;
