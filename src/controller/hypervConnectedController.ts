import {Request, Response, NextFunction} from 'express';
import hypervConnectedService from '../service/HypervConnectedService.js';

class HypervConnectedController {
    public getHyperVConnect(req: Request, res: Response): void {
        res.json({data: hypervConnectedService.getHypervStatus()});
    }

    public getHyperVUpdate(req: Request, res: Response): void {
        const socket = req.app.get('socketio');
        const data = req.query as ObjType;
        hypervConnectedService.getHyperVUpdate(data);
        //hypervConnectedService.getHyperVUpdate(socket, data);
        res.json({success: true});
    }

    public test(res: Response): void {
        hypervConnectedService.test(res);
    }
}

export default new HypervConnectedController();
