import {Request, Response} from 'express';
import {DBLogger} from '../../utils/DBLogger.js';
import {SlackException} from '../../exception/exceptions.js';
import {OtpHandler} from './handlers/OtpHandler.js';
import {NbbangHandler} from './handlers/NbbangHandler.js';
import {WikiHandler} from './handlers/WikiHandler.js';
import {ChatHandler} from './handlers/ChatHandler.js';
import {HelpBlocks} from './blocks/HelpBlocks.js';
import {RemoteRequestHandler} from './handlers/RemoteRequestHandler.js';
import {OtpSocketRequestHandler} from './handlers/OtpSocketRequestHandler.js';
import {SlackMessenger} from '../../messenger/slack/SlackMessenger.js';

export class SlackRouter {
    private readonly slackClient: SlackMessenger;

    constructor(slackClient: SlackMessenger) {
        this.slackClient = slackClient;
    }

    public async handleCommands(req: Request, res: Response): Promise<void> {
        const {command, user_id} = req.body;

        switch (command) {
            case '/otp':
            case '/otp_test':
                await DBLogger.slack(`Command [${command}]`, req.body);
                res.status(200).send();
                await OtpHandler.handleOtpCommand(req, res);
                break;
            case '/nbbang':
            case '/nbbang_test':
                await DBLogger.slack(`Command [${command}]`, req.body);
                res.status(200).send();
                await NbbangHandler.handleCommand(req, res, this.slackClient);
                break;
            case '/ask':
            case '/ask_test':
                await DBLogger.slack(`Command [${command}]`, req.body);
                // 슬랙 3초 제한 대응: 먼저 "생각 중" ack을 보내고, 실제 답변은 response_url로 지연 전송
                res.status(200).json({
                    response_type: 'ephemeral',
                    text: '답변을 찾고 있어요... 잠시만요.'
                });
                await ChatHandler.handleCommand(req);
                break;
            case '/help':
            case '/help_test':
                res.status(200).json({
                    response_type: 'ephemeral',
                    blocks: HelpBlocks.buildHelpBlocks(),
                    text: 'help 검색 결과입니다.'
                });
                break;
            default:
                throw new SlackException('알 수 없는 명령어입니다.', 200);
        }
    }

    public async handleInteractivity(req: Request, res: Response): Promise<void> {
        const payload = JSON.parse(req.body.payload);
        res.status(200).send();

        if (payload.type === 'block_actions' || payload.type === 'interactive_message') {
            const {response_url} = payload;
            const [action] = payload.actions;
            const {action_id, value} = action || {};
            const actionKey = action_id || action.name;

            switch (actionKey) {
                case 'refresh_otp':
                    await OtpHandler.handleRefreshAction(payload, value, response_url);
                    break;
                case 'share_otp':
                    await OtpHandler.handleShareAction(payload, value, this.slackClient);
                    break;
                case 'post':
                    await WikiHandler.handlePostAction(payload, value, response_url);
                    break;
                case 'remote_request_approve':
                    await RemoteRequestHandler.handleApproveAction(payload, value, response_url, this.slackClient);
                    break;
                case 'remote_request_deny':
                    await RemoteRequestHandler.handleDenyAction(payload, value, response_url, this.slackClient);
                    break;
                case 'waitlist_connect_request':
                    await RemoteRequestHandler.handleWaitlistConnectAction(payload, value, response_url, this.slackClient);
                    break;
                case 'otp_request_approve':
                    await OtpSocketRequestHandler.handleApproveAction(payload, value, response_url, this.slackClient);
                    break;
                case 'otp_request_deny':
                    await OtpSocketRequestHandler.handleDenyAction(payload, value, response_url, this.slackClient);
                    break;
                default:
                    break;
            }

            // 모든 블럭액션(버튼 클릭 등) 처리가 끝난 후 한 번에 공통으로 로깅
            if (actionKey) {
                await DBLogger.slack(
                    `Slack Button [${actionKey}] 액션 처리`,
                    {
                        action_id,
                        value,
                        channel: payload.channel?.name || payload.channel?.id
                    },
                    payload.user?.id
                );
            }
            return;
        }

        if (payload.type === 'view_submission') {
            if (payload.view.callback_id === 'nbbang_modal_submit') {
                await NbbangHandler.handleModalSubmit(payload, this.slackClient);
            }
        }
    }
}
