import {Request, Response} from 'express';
import {NbbangBlocks} from '../blocks/NbbangBlocks.js';
import {SlackMessenger} from '../../../messenger/slack/SlackMessenger.js';
import { apiClient } from '../../../modules/httpClient/ApiClient.js';
import logger from '../../../utils/logger.js';

export class NbbangHandler {
    static async handleCommand(req: Request, res: Response, slackClient: SlackMessenger) {
        const {trigger_id, response_url} = req.body;

        try {
            await slackClient.openModal(trigger_id, NbbangBlocks.buildModalView(response_url));
        } catch (error) {
            logger.error('N빵 모달 띄우기 실패:', error);
        }
    }

    static async handleModalSubmit(payload: any, slackClient?: SlackMessenger) {
        const responseUrl = payload.view.private_metadata;
        const values = payload.view.state.values;

        const titleStr = values.title_block.title_input.value;
        const amountStr = values.amount_block.amount_input.value;
        const selectedUsers = values.users_block.users_select.selected_users || [];

        const detailsStr = values.details_block?.details_input?.value || '';
        const accountStr = values.account_block?.account_input?.value || '미입력 (정산자에게 별도 문의)';

        const dmCheckOptions = values.dm_check_block?.dm_check_action?.selected_options || [];
        const isSendDm = dmCheckOptions.some((opt: any) => opt.value === 'send_dm');

        const totalAmount = amountStr
            .split(',')
            .map((str: string) => parseInt(str.trim().replace(/[^0-9]/g, ''), 10) || 0)
            .reduce((sum: number, val: number) => sum + val, 0);
        const userCount = selectedUsers.length;

        if (userCount === 0) {
            logger.warn('N빵 대상자가 선택되지 않음');
            return;
        }

        const perPerson = Math.ceil(totalAmount / userCount);
        const userMentions = selectedUsers.map((uid: string) => `<@${uid}>`).join(' ');

        const messageBlocks = NbbangBlocks.buildResultBlocks(titleStr, detailsStr, totalAmount, userCount, userMentions, perPerson, accountStr);

        const response = await apiClient.post(responseUrl, {
            response_type: 'in_channel',
            blocks: messageBlocks
        });

        if (!response.success) {
            logger.error('N빵 결과 메시지 전송 실패:', response.error, response.details);
        }

        if (isSendDm && slackClient && selectedUsers.length > 0) {
            try {
                const targets = selectedUsers.map((uid: string) => ({
                    channelId: uid,
                    message: messageBlocks
                }));
                await slackClient.broadcast(targets, messageBlocks);
                logger.info(`N빵 개별 메시지 ${userCount}명에게 발송 완료`);
            } catch (error) {
                logger.error('N빵 개별 메시지 발송 에러:', error);
            }
        }
    }
}
