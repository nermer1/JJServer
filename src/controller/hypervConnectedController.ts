import {Request, Response, NextFunction} from 'express';
import hypervService from '../service/hypervConnectedService.js';

const controller = {
    getHyperVConnect: (req: Request, res: Response) => {
        res.json({data: hypervService.getHypervStatus()});
    },
    getHyperVUpdate: (req: Request, res: Response) => {
        const socket = req.app.get('socketio');
        const data = req.query as ObjType;
        hypervService.getHyperVUpdate(socket, data);
        res.json({success: true});
    }
};

export default controller;
