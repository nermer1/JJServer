import {Request, Response, NextFunction} from 'express';
import {schemas} from '../schemas/schemaMap.js';
import StringUtils from '../utils/StringUtils.js';
import otpService from './OtpService.js';
import ApiReturn from '../structure/ApiReturn.js';
import {SlackMessenger} from '../messenger/slackMessenger.js';
import axios from 'axios';
import logger from '../utils/logger.js';
import {SlackException} from '../exception/SlackException.js';

class SlackService {
    private readonly token = ''; // 설정으로 빼야됨.. 암호화 하던가 깃 푸시 되면 안된다.
    private readonly slack = new SlackMessenger(this.token);

    public async commands(req: Request, res: Response): Promise<void> {
        const params: DBParamsType = {
            type: 'R',
            data: {
                tableData: []
            }
        };

        logger.info('Slack Command 요청 받음', {meta: req.body});

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
        //안뇽 에 대한 검색결과가 없습니다.
    }

    public async notify(req: Request, res: Response): Promise<void> {
        logger.info('Slack Notify 요청 받음', {meta: req.body});
        const {message, from, channelId}: {message: string; from: string; channelId?: string} = req.body;
        res.status(200).send();

        const regex = /[\(\[]?(\d{4,8})[\)\]]?/;
        const match = message.match(regex);
        const result = match !== null ? match[1] : message;

        //일단 하드코딩? 보낸 번호 기준? 애매하긴함
        const team2ChannelId = 'G09GEKK9WKD';
        const customer: ObjAny = {
            '+82312609300': {
                channelId: channelId ?? team2ChannelId,
                message: `[녹십자] \`${result}\``
            },
            '03180141779': {
                channelId: channelId ?? team2ChannelId,
                message: `[한화] \`${result}\``
            },
            '+82262636100': {
                channelId: channelId ?? 'G09GEKK2VKM', // 장정호 팀 하코
                message: `[SK스퀘어] \`${result}\``
            },
            '+82264000888': {
                channelId: channelId ?? 'G09GEKK2VKM', // 장정호 팀 하코, 주식회사, 유지피에스 가공 없이 본문만 넘김
                message
            },
            '+82437184114': {
                channelId: channelId ?? 'G09GEKK2VKM', // 장정호 팀 하코
                message: `[키파운드리] \`${result}\``
            },
            '+8227280822': {
                channelId: channelId ?? 'G09GEKK2VKM', // 장정호 팀 하코
                message: `[SK머트리얼] \`${result}\``
            }
        };

        const payload = customer[from] || {};

        // slack rest api 호출, 인증 토큰이 있어야 하지만
        // sms 어플 등 rest api 파라미터를 줄 수 잇는지 어떤진 모르겠군, 고민이 필요함 아무나 주소만 알면 걍 메시지 남발 가능함
        //[\(\[]?(\d+)[\(\[]?
        // 일단 아이폰은 자동화, 단축어 header에 값 넣을 수 있음
        if (Object.keys(payload).length === 0) throw new SlackException(`[Slack Notify] 알 수 없는 발신자 ${from}`, 200);

        await this.slack.sendMessage({
            channelId: payload.channelId,
            message: payload.message
        });
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        const payload = JSON.parse(req.body.payload);
        const {response_url} = payload;
        const [action] = payload.actions;
        const {action_id, value} = action || {};

        logger.info('[Slack button]', {payload});
        logger.info('[Slack button]', {action_id, value});
        res.status(200).send();

        switch (action_id) {
            case 'refresh_otp': {
                const otpList = await otpService.getList([value]);
                const blocks = this.getBlocks(otpList, action);

                await axios.post(response_url, {
                    replace_original: true,
                    text: 'OTP가 갱신되었습니다.',
                    response_type: 'ephemeral',
                    blocks
                });
                break;
            }
            case 'share_otp': {
                const otpList = await otpService.getList([value]);
                const blocks = this.getBlocks(otpList, action);

                await this.slack.sendCardMessage({
                    channelId: payload.channel.id,
                    message: blocks
                });
                break;
            }
            default: {
                break;
            }
        }
    }

    public getHelpBlocks(): any[] {
        const teamId = 'T09FLTRKP9Q';
        return [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '사용 가능한 명령어 목록'
                }
            },
            {type: 'divider'},
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*기본 기능*\n>`/help` : 도움말 표시'
                },
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '이동',
                        emoji: true
                    },
                    url: `slack://user?team=${teamId}&id=U0ACRE98NG0`,
                    style: 'primary'
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '>`/otps` : OTP 팝업 오픈'
                },
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '이동',
                        emoji: true
                    },
                    url: `slack://user?team=${teamId}&id=U09V06LH2G6`,
                    style: 'primary'
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '>`/유니이츠` : 모두가 만드는 맛집 가이드'
                },
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '이동',
                        emoji: true
                    },
                    url: `slack://user?team=${teamId}&id=U0A9B1L2N03`,
                    style: 'primary'
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '>`/otp [검색어]` : 특정 OTP 조회 (예: `/otp 유니포스트`)\n' + '>`/wiki [검색어]` : 사내 위키 검색(예: `/wiki 유니포스트`)'
                }
            }
        ];
    }

    private getBlocks(otpList: ApiReturn, action: ObjType = {}): any[] {
        const {timeUse} = otpList.getReturnData();
        const otpData = otpList.getTableData();
        const now = new Date();
        const remainSeconds = 30 - Number(timeUse);
        const expiryTime = new Date(now.getTime() + remainSeconds * 1000);
        const {action_id} = action;

        // 시간 포맷팅 (HH:mm:ss)
        const expiryStr = expiryTime.toTimeString().split(' ')[0];

        // 블록 조립
        const blocks: any[] = [];

        // 새로고침, 공유에 다른 보여주기 분기
        if (action_id !== 'share_otp') {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `총 ${otpData.length}건의 검색 결과가 있습니다.`
                }
            });
        }

        // 0건일 때는 안타게 처리 해야됨
        if (otpData.length === 0) return blocks;

        // [헤더] 유효 시간 안내
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*유효 시간:* \`${expiryStr}\` 까지 (약 ${remainSeconds}초 남음)`
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
                    text: userOtpList
                }
            });

            const buttons = [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '🔄새로고침',
                        emoji: true
                    },
                    value: `${companyName}`,
                    action_id: 'refresh_otp',
                    style: remainSeconds < 5 ? 'danger' : 'primary'
                } /* ,
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '📢공유하기',
                        emoji: true
                    },
                    value: `${companyName}`,
                    action_id: 'share_otp'
                } */
            ];
            // 공유하기는 고민이 좀 필요하군..
            //if (action_id === 'share_otp') buttons.pop();

            blocks.push({
                type: 'actions',
                elements: buttons
            });

            blocks.push({type: 'divider'});
        });

        return blocks;
    }
}

export default new SlackService();
