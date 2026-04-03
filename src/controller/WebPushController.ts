import {Request, Response} from 'express';
import WebPushService from '../service/WebPushService.js';

class WebPushController {
    public getVapidPublicKey(req: Request, res: Response): void {
        const key = WebPushService.getVapidPublicKey();
        if (!key) {
            res.status(503).json({ok: false});
            return;
        }
        res.json({publicKey: key});
    }

    public subscribePush(req: Request, res: Response): void {
        const {subscription, hostname} = req.body;
        if (!subscription || !hostname) {
            res.status(400).json({ok: false});
            return;
        }

        WebPushService.subscribePush(hostname, subscription);
        res.json({ok: true});
    }
}

export default new WebPushController();

