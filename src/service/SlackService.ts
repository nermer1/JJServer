import {Request, Response, NextFunction} from 'express';
import {schemas} from '../schemas/schemaMap.js';
import StringUtils from '../utils/StringUtils.js';
import otpService from './OtpService.js';
import ApiReturn from '../structure/ApiReturn.js';
import axios from 'axios';

class SlackService {
    public async commands(req: Request, res: Response): Promise<void> {
        const params: DBParamsType = {
            type: 'R',
            data: {
                tableData: []
            }
        };
        const {text} = req.body;
        const schema = schemas.customerList;
        const data = await schema.findAll(params);
        const tableData = data.getTableData();
        const filteredList = tableData.filter((item) => item.etc?.otp?.length > 0);
        const results: ObjType[] = StringUtils.fuzzySearch(filteredList, text, {keys: ['code', 'text']});
        const codeArr = results.map((item) => item.code);
        const otpList = await otpService.getList(codeArr);

        res.json({
            response_type: 'ephemeral',
            blocks: this.getBlocks(otpList),
            text: 'OTP 검색 결과입니다.'
        });
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        const payload = JSON.parse(req.body.payload);
        const {response_url} = payload;
        const [action] = payload.actions;
        const {action_id, value} = action || {};

        console.log(payload);
        console.log(action_id, value);
        res.status(200).send();

        switch (action_id) {
            case 'refresh_otp': {
                const otpList = await otpService.getList([value]);
                const blocks = this.getBlocks(otpList);

                await axios.post(response_url, {
                    replace_original: true,
                    text: 'OTP가 갱신되었습니다.',
                    response_type: 'ephemeral',
                    blocks
                });
                break;
            }
            default: {
                break;
            }
        }
    }

    private getBlocks(otpList: ApiReturn): any[] {
        const {timeUse} = otpList.getReturnData();
        const otpData = otpList.getTableData();
        const now = new Date();
        const remainSeconds = 30 - Number(timeUse);
        const expiryTime = new Date(now.getTime() + remainSeconds * 1000);

        // 시간 포맷팅 (HH:mm:ss)
        const expiryStr = expiryTime.toTimeString().split(' ')[0];

        // 블록 조립
        const blocks: any[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `검색어와 관련된 데이터를 ${otpData.length}건 찾았습니다.`
                }
            }
        ];

        if (otpData.length === 0) return blocks;

        // 0건일 때는 안타게 처리 해야됨

        // [헤더] 유효 시간 안내
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*유효 시간:* ${expiryStr} 까지 (약 ${remainSeconds}초 남음)`
            }
        });

        blocks.push({type: 'divider'});

        otpData.forEach((item) => {
            const [companyName, users] = Object.entries(item)[0];

            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${companyName}*`
                },
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '🔄 Refresh',
                        emoji: true
                    },
                    value: `${companyName}`,
                    action_id: 'refresh_otp'
                }
            });

            const userOtpList = users
                .map((v: {user: string; otp: string}) => {
                    return `- ${v.user}: \`${v.otp}\``;
                })
                .join('\n');

            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: userOtpList || 'OTP 정보 없음'
                }
            });

            blocks.push({type: 'divider'});
        });

        return blocks;
    }
}

export default new SlackService();
