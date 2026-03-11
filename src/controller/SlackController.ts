import {Request, Response} from 'express';
import slackService from '../service/SlackService.js';
import {SlackException} from '../exception/exceptions.js';

class SlackController {
    public async commands(req: Request, res: Response): Promise<void> {
        await slackService.commands(req, res);
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        await slackService.interactivity(req, res);
    }

    public async notify(req: Request, res: Response): Promise<void> {
        await slackService.notify(req, res);
    }
}

export default new SlackController();
