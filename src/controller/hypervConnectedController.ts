import {Request, Response, NextFunction} from 'express';
import hypervService from '../service/hypervConnectedService.js';

const controller = {
    getHyperVConnect: (req: Request, res: Response) => {
        res.json({data: hypervService.getHypervStatus()});
    },
    getHyperVUpdate: (req: Request, res: Response) => {
        hypervService.getHyperVUpdate(req, res);
        res.json({
            success: true
        });
    }
};

export default controller;
