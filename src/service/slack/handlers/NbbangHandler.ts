import {Request, Response} from 'express';
import {NbbangBlocks} from '../blocks/NbbangBlocks.js';
import {SlackMessenger} from '../../../messenger/slack/SlackMessenger.js';
import axios from 'axios';
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

    static async handleModalSubmit(payload: any) {
        try {
            const responseUrl = payload.view.private_metadata;
            const values = payload.view.state.values;

            const titleStr = values.title_block.title_input.value;
            const amountStr = values.amount_block.amount_input.value;
            const selectedUsers = values.users_block.users_select.selected_users || [];

            const detailsStr = values.details_block?.details_input?.value || '';
            const accountStr = values.account_block?.account_input?.value || '미입력 (정산자에게 별도 문의)';

            const totalAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
            const userCount = selectedUsers.length;

            if (userCount === 0) {
                logger.warn('N빵 대상자가 선택되지 않음');
                return;
            }

            const perPerson = Math.ceil(totalAmount / userCount);
            const userMentions = selectedUsers.map((uid: string) => `<@${uid}>`).join(' ');

            const messageBlocks = NbbangBlocks.buildResultBlocks(titleStr, detailsStr, totalAmount, userCount, userMentions, perPerson, accountStr);

            await axios.post(responseUrl, {
                response_type: 'in_channel',
                blocks: messageBlocks
            });
        } catch (error) {
            logger.error('N빵 계산 에러:', error);
        }
    }
}
