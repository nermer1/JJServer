import {Request, Response, NextFunction} from 'express';
import {schemas} from '../schemas/schemaMap.js';
import StringUtils from '../utils/StringUtils.js';
import otpService from './OtpService.js';
import ApiReturn from '../structure/ApiReturn.js';
import {SlackMessenger} from '../messenger/slack/SlackMessenger.js';
import axios from 'axios';
import logger from '../utils/logger.js';
import {SlackException} from '../exception/exceptions.js';
import {apiClient} from '../modules/httpClient/ApiClient.js';
import DateUtils from '../utils/DateUtils.js';

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
        res.status(200).send();

        const {text, response_url} = req.body;
        const schema = schemas.customerList;
        const data = await schema.getOptList(params);
        const tableData = data.getTableData();
        const results: ObjType[] = StringUtils.fuzzySearch(tableData, text, {keys: ['customer.code', 'customer.text']});
        const codeArr = results.map((item: any) => item.customer.code);
        const otpList = await otpService.getList(codeArr);

        await axios.post(response_url, {
            replace_original: true,
            text: 'OTP 검색 결과입니다.',
            response_type: 'ephemeral',
            blocks: this.getBlocks(otpList)
        });
    }

    public async notify(req: Request, res: Response): Promise<void> {
        logger.info('Slack Notify 요청 받음', {meta: req.body});
        const {message, from, channelId}: {message: string; from: string; channelId?: string} = req.body;
        res.status(200).send();

        // 여기서 나온 슬랙 아이디로 promise.all로 20개씩 끊어서 발송한다고 해보장

        const regex = /\b\d{4,8}\b/;
        const match = message.match(regex);
        const sendMessage = match !== null ? match[0] : message;
        const customer = await schemas.customerEtc.model.find({'otp.type': {$in: ['sms', 'email']}}, {'otp.$': 1, code: 1, _id: 0}).lean();
        const customer1 = customer.find((item) => item.otp.some((o: any) => o.user === from));
        const code = customer1?.code ?? '';
        const slackIds = await schemas.users.model.find({'settings.notifications.slack.otp': code}, {slackId: 1, _id: 0});

        //일단 하드코딩? 보낸 번호 기준? 애매하긴함
        // slack 외부 api 호출이긴 한데.. 어캐 분기를 내린담
        /* const team2ChannelId = 'G09GEKK9WKD';
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
            },
            'otp@bkr.co.kr': {
                channelId: channelId ?? 'G09GEKK2VKM', // 장정호 팀 하코
                message: `[버거킹] \`${result}\``
            },
            'hanwhaotpserver@gmail.com': {
                channelId: channelId ?? team2ChannelId, // 임팩트 맞나
                message: `[한화임팩트] \`${result}\``
            },
            'yocotp@youngone.co.kr': {
                channelId: channelId ?? team2ChannelId,
                message: `[영원아웃도어] \`${result}\``
            },
            'unipost004@gmail.com': {
                channelId: channelId ?? 'G09GEKK2VKM',
                message: `[SK플래닛] \`${result}\``
            },
            'dbsafer@poongsan.co.kr': {
                channelId: channelId ?? team2ChannelId,
                message: `[풍산] \`${result}\``
            }
        }; 

        const payload = customer[from] || {};*/

        // slack rest api 호출, 인증 토큰이 있어야 하지만
        // sms 어플 등 rest api 파라미터를 줄 수 잇는지 어떤진 모르겠군, 고민이 필요함 아무나 주소만 알면 걍 메시지 남발 가능함
        //[\(\[]?(\d+)[\(\[]?
        // 일단 아이폰은 자동화, 단축어 header에 값 넣을 수 있음
        /* if (Object.keys(payload).length === 0) throw new SlackException(`[Slack Notify] 알 수 없는 발신자 ${from}`, 200);

        await this.slack.sendMessage({
            channelId: payload.channelId,
            message: payload.message
        }); */

        /* const targets: any[] = slackIds.map((item) => {
            item.channelId = item.slackId;
            item.message = sendMessage;
            return item;
        }); */
        const targets: any[] = slackIds.map((item) => ({
            channelId: item.slackId,
            message: `[${code}] \`${sendMessage}\``
        }));

        const result = await this.slack.broadcast(targets, '', 20);
        logger.info('[slack notify]', {result});
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        const payload = JSON.parse(req.body.payload);
        const {response_url} = payload;
        const [action] = payload.actions;
        const {action_id, value} = action || {};
        const actionKey = action_id || action.name;

        logger.info('[Slack button]', {payload});
        logger.info('[Slack button]', {action_id, value});
        res.status(200).send();

        switch (actionKey) {
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
            case 'post': {
                // wiki
                const OUTLINE_API_KEY = '';
                const OUTLINE_BASE_URL = 'http://wiki:3000/api';

                const outlineClient = axios.create({
                    baseURL: OUTLINE_BASE_URL,
                    headers: {
                        Authorization: `Bearer ${OUTLINE_API_KEY}`,
                        'Content-Type': 'application/json',
                        'X-Forwarded-Proto': 'https'
                    }
                });

                const response = await outlineClient.post('/documents.info', {id: value});
                const doc: any = response.data.data;

                console.log(doc);

                const messagePayload = {
                    replace_original: false, // 기존 검색 결과 유지 여부 (형 의도에 따라 true/false)
                    response_type: 'in_channel', // 채널 전체 공개
                    attachments: [
                        // ★ 핵심: attachments 배열 사용
                        {
                            color: '#0052CC', // Outline 브랜드 컬러 (파란색)
                            blocks: [
                                {
                                    type: 'section',
                                    text: {
                                        type: 'mrkdwn',
                                        // 제목에 링크 걸기
                                        text: `*<https://wiki.unipost.co.kr${doc.url}|${doc.title}>*`
                                    }
                                },
                                {
                                    type: 'context',
                                    elements: [
                                        {
                                            type: 'mrkdwn',
                                            // 컬렉션 이름 | 날짜 (첫 번째 이미지 하단 스타일)
                                            // doc.collection.name이 없으면 doc.collectionId 등으로 대체 확인 필요
                                            text: `${doc.collection?.name || 'wiki'} | ${DateUtils.formatDateWithString(doc.createdAt)}`
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                };

                await axios.post(response_url, messagePayload);

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
