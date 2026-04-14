import {Request, Response, NextFunction} from 'express';
import HypervConnectedService from '../service/HypervConnectedService.js';

class HypervConnectedController {
    public getHyperVConnect(req: Request, res: Response): void {
        res.json({data: HypervConnectedService.getHypervStatus()});
    }

    public getHyperVUpdate(req: Request, res: Response): void {
        //const socket = req.app.get('socketio');
        const data = req.query as ObjType;
        HypervConnectedService.getHyperVUpdate(data).catch(() => {
            res.status(500).json({error: 'Internal Server Error'});
        });
        res.json({success: true});
    }
}

export default new HypervConnectedController();
