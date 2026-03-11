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

    public async handleOtpCommand(req: Request, res: Response): Promise<void> {
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

    public async handleNbbangCommand(req: Request, res: Response): Promise<void> {
        logger.info('Slack Command 요청 받음 (N빵)', {meta: req.body});
        res.status(200).send();

        const {trigger_id, response_url} = req.body;

        try {
            await this.slack.openModal(trigger_id, {
                type: 'modal',
                callback_id: 'nbbang_modal_submit',
                private_metadata: response_url,
                title: {type: 'plain_text', text: 'N빵 계산기'},
                blocks: [
                    {
                        type: 'input',
                        block_id: 'title_block',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'title_input',
                            placeholder: {type: 'plain_text', text: '예: 2월 11일 개발팀 회식'}
                        },
                        label: {type: 'plain_text', text: '정산 제목'}
                    },
                    {
                        type: 'input',
                        block_id: 'details_block',
                        optional: true,
                        element: {
                            type: 'plain_text_input',
                            action_id: 'details_input',
                            multiline: true,
                            placeholder: {type: 'plain_text', text: '예:\n1차 삼겹살: 150,000원\n2차 맥주: 50,000원'}
                        },
                        label: {type: 'plain_text', text: '상세 내역 (선택)'}
                    },
                    {
                        type: 'input',
                        block_id: 'amount_block',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'amount_input',
                            placeholder: {type: 'plain_text', text: '예: 200000'}
                        },
                        label: {type: 'plain_text', text: '총 결제 금액'}
                    },
                    {
                        type: 'input',
                        block_id: 'account_block',
                        optional: true,
                        element: {
                            type: 'plain_text_input',
                            action_id: 'account_input',
                            placeholder: {type: 'plain_text', text: '예: 카카오페이, 토스, 계좌번호 등'}
                        },
                        label: {type: 'plain_text', text: '입금 계좌 (선택)'}
                    },
                    {
                        type: 'input',
                        block_id: 'users_block',
                        element: {
                            type: 'multi_users_select',
                            action_id: 'users_select',
                            placeholder: {type: 'plain_text', text: '함께한 사람들을 골라주세요'}
                        },
                        label: {type: 'plain_text', text: '정산 대상자'}
                    }
                ],
                submit: {type: 'plain_text', text: '계산하기'}
            });
        } catch (error) {
            logger.error('N빵 모달 띄우기 실패:', error);
        }
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
        const targets: any[] = slackIds.map((item) => ({
            channelId: item.slackId,
            message: `[${code}] \`${sendMessage}\``
        }));

        const result = await this.slack.broadcast(targets, '', 20);
        logger.info('[slack notify]', {result});
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        const payload = JSON.parse(req.body.payload);

        res.status(200).send();

        if (payload.type === 'block_actions' || payload.type === 'interactive_message') {
            const {response_url} = payload;
            const [action] = payload.actions;
            const {action_id, value} = action || {};
            const actionKey = action_id || action.name;

            logger.info('[Slack button]', {payload});

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
            return;
        }

        if (payload.type === 'view_submission') {
            if (payload.view.callback_id === 'nbbang_modal_submit') {
                logger.info('[Slack button]', {payload});
                try {
                    const response_url = payload.view.private_metadata;
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

                    const messageBlocks = [
                        {type: 'header', text: {type: 'plain_text', text: `N빵 정산: ${titleStr}`}},
                        {
                            type: 'section',
                            text: {type: 'mrkdwn', text: `*상세 내역*\n${detailsStr}`}
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*총 결제 금액:* ${totalAmount.toLocaleString()}원\n👥 *정산 대상자 (${userCount}명):* ${userMentions}`
                            }
                        },
                        {type: 'divider'},
                        {type: 'section', text: {type: 'mrkdwn', text: `*1인당 송금액: ${perPerson.toLocaleString()}원*`}},
                        {type: 'divider'},
                        {type: 'context', elements: [{type: 'mrkdwn', text: `*입금:* ${accountStr}`}]}
                    ];

                    await axios.post(response_url, {
                        response_type: 'in_channel',
                        blocks: messageBlocks
                    });
                } catch (error) {
                    logger.error('N빵 계산 에러:', error);
                }
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
