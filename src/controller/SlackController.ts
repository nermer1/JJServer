import {Request, Response} from 'express';
import slackService from '../service/SlackService.js';
import {SlackException} from '../exception/exceptions.js';

class SlackController {
    public async commands(req: Request, res: Response): Promise<void> {
        const {command} = req.body;
        switch (command) {
            case '/otp':
                await slackService.commands(req, res);
                break;
            case '/help':
                res.json({
                    response_type: 'ephemeral',
                    blocks: slackService.getHelpBlocks(),
                    text: 'help 검색 결과입니다.'
                });
                break;
            default:
                throw new SlackException('알 수 없는 명령어입니다.', 200);
        }
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        await slackService.interactivity(req, res);
    }

    public async notify(req: Request, res: Response): Promise<void> {
        await slackService.notify(req, res);
    }
}

export default new SlackController();
