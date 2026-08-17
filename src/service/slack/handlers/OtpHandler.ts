import {Request, Response} from 'express';
import StringUtils from '../../../utils/StringUtils.js';
import otpService from '../../OtpService.js';
import {OtpBlocks} from '../blocks/OtpBlocks.js';
import {SlackMessenger} from '../../../messenger/slack/SlackMessenger.js';
import {apiClient} from '../../../modules/httpClient/ApiClient.js';
import MongoDB from '../../../db/MongoDB.js';

export class OtpHandler {
    static async handleOtpCommand(req: Request, res: Response) {
        const db = MongoDB.getDb();
        const data = await db
            .collection('customer')
            .find({}, {projection: {code: 1, text: 1, _id: 0}})
            .toArray();
        const {text, response_url} = req.body;
        const results: any[] = StringUtils.fuzzySearch(data, text, {keys: ['code', 'text']});
        const codeArr = results.map((item: any) => item.code);
        const otpList = await otpService.getList(codeArr);

        await apiClient.post(response_url, {
            replace_original: true,
            text: 'OTP 검색 결과입니다.',
            response_type: 'ephemeral',
            blocks: OtpBlocks.buildOtpBlocks(otpList)
        });
    }

    static async handleRefreshAction(payload: any, value: string, responseUrl: string) {
        const otpList = await otpService.getList([value]);
        const blocks = OtpBlocks.buildOtpBlocks(otpList, 'refresh_otp');

        await apiClient.post(responseUrl, {
            replace_original: true,
            text: 'OTP가 갱신되었습니다.',
            response_type: 'ephemeral',
            blocks
        });
    }

    static async handleShareAction(payload: any, value: string, slackClient: SlackMessenger) {
        const otpList = await otpService.getList([value]);
        const blocks = OtpBlocks.buildOtpBlocks(otpList, 'share_otp');

        await slackClient.sendCardMessage({
            channelId: payload.channel.id,
            message: blocks
        });
    }
}
