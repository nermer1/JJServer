import {Request, Response} from 'express';
import {SlackMessenger} from '../messenger/slack/SlackMessenger.js';
import {schemas} from '../schemas/schemaMap.js';
import logger from '../utils/logger.js';
import {SlackRouter} from './slack/SlackRouter.js';
import {basicProperty} from '../properties/ServerProperty.js';

class SlackService {
    private readonly token = basicProperty.slack.token;
    private readonly slack = new SlackMessenger(this.token);
    private readonly router = new SlackRouter(this.slack);

    public async commands(req: Request, res: Response): Promise<void> {
        await this.router.handleCommands(req, res);
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        await this.router.handleInteractivity(req, res);
    }

    public async notify(req: Request, res: Response): Promise<void> {
        logger.info('Slack Notify 요청 받음', {meta: req.body});
        const {message, from, channelId}: {message: string; from: string; channelId?: string} = req.body;
        res.status(200).send();

        // 여기서 나온 슬랙 아이디로 promise.all로 20개씩 끊어서 발송한다고 해보장
        // todo 알림도 otp 인지 아닌지 여러 타입 구분을 주고 처리해야 될 듯

        const regex = /\b\d{4,8}\b/;
        const match = message.match(regex);
        const sendMessage = match !== null ? match[0] : message;
        const customer = await schemas.customerEtc.model.find({'otp.type': {$in: ['sms', 'email']}}, {'otp.$': 1, code: 1, _id: 0}).lean();
        const customer1 = customer.find((item: any) => item.otp.some((o: any) => o.user === from));
        const code = customer1?.code ?? '';
        const slackIds = await schemas.users.model.find({'settings.notifications.slack.otp': code}, {slackId: 1, _id: 0});
        const targets: any[] = slackIds.map((item: any) => ({
            channelId: item.slackId,
            message: `[${code}] \`${sendMessage}\``
        }));

        const result = await this.slack.broadcast(targets, '', 20);
        logger.info('[slack notify]', {result});
    }
}

export default new SlackService();
