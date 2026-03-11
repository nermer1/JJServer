import {Request, Response} from 'express';
import {schemas} from '../../../schemas/schemaMap.js';
import StringUtils from '../../../utils/StringUtils.js';
import otpService from '../../OtpService.js';
import {OtpBlocks} from '../blocks/OtpBlocks.js';
import {SlackMessenger} from '../../../messenger/slack/SlackMessenger.js';
import axios from 'axios';

export class OtpHandler {
    static async handleOtpCommand(req: Request, res: Response) {
        const params: any = {
            type: 'R',
            data: {
                tableData: []
            }
        };

        const {text, response_url} = req.body;
        const schema = schemas.customerList;
        const data = await schema.getOptList(params);
        const tableData = data.getTableData();
        const results: any[] = StringUtils.fuzzySearch(tableData, text, {keys: ['customer.code', 'customer.text']});
        const codeArr = results.map((item: any) => item.customer.code);
        const otpList = await otpService.getList(codeArr);

        await axios.post(response_url, {
            replace_original: true,
            text: 'OTP 검색 결과입니다.',
            response_type: 'ephemeral',
            blocks: OtpBlocks.buildOtpBlocks(otpList)
        });
    }

    static async handleRefreshAction(payload: any, value: string, responseUrl: string) {
        const otpList = await otpService.getList([value]);
        const blocks = OtpBlocks.buildOtpBlocks(otpList, 'refresh_otp');

        await axios.post(responseUrl, {
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
