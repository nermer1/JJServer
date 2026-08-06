import {Request, Response} from 'express';
import HypervSocketService from '../service/HypervSocketService.js';

class HypervSocketController {
    public async heartbeat(req: Request, res: Response): Promise<void> {
        const {hostname, activeVMs, activePhones} = req.body;
        if (!hostname) {
            res.status(400).json({ok: false, message: 'hostname required'});
            return;
        }

        await HypervSocketService.handleHeartbeat(hostname, activeVMs, activePhones);
        res.json({ok: true});
    }

    public async requestVm(req: Request, res: Response): Promise<void> {
        const {vmName, requesterName, requesterHostname} = req.body;
        if (!vmName || !requesterName) {
            res.status(400).json({ok: false});
            return;
        }

        const result = await HypervSocketService.requestVm(vmName, requesterName, requesterHostname);
        res.json(result);
    }

    public async requestOtp(req: Request, res: Response): Promise<void> {
        const {phoneName, requesterName, requesterHostname} = req.body;
        if (!phoneName || !requesterName) {
            res.status(400).json({ok: false});
            return;
        }

        const result = await HypervSocketService.requestOtp(phoneName, requesterName, requesterHostname);
        res.json(result);
    }

    public requestResponse(req: Request, res: Response): void {
        const {vmName, accepted, requesterHostname} = req.body;
        if (!vmName || accepted === undefined) {
            res.status(400).json({ok: false});
            return;
        }

        HypervSocketService.requestResponse(vmName, accepted, requesterHostname);
        res.json({ok: true});
    }
}

export default new HypervSocketController();
