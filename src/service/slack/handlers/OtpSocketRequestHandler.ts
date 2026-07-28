import {Request, Response} from 'express';
import {apiClient} from '../../../modules/httpClient/ApiClient.js';
import {SlackMessenger} from '../../../messenger/slack/SlackMessenger.js';
import {OtpRequestBlocks} from '../blocks/OtpRequestBlocks.js';
import HypervSocketService from '../../HypervSocketService.js';
import {schemas} from '../../../schemas/schemaMap.js';
import {dateUtil} from '../../../utils/Utils.js';
import logger from '../../../utils/logger.js';

export class OtpSocketRequestHandler {
    static async handleApproveAction(payload: any, value: string, responseUrl: string, slackClient: SlackMessenger) {
        const messageTs = payload.message?.ts || payload.container?.message_ts;
        if (messageTs) {
            if (dateUtil.isUnixSecondsExpired(messageTs, 60)) {
                await apiClient.post(responseUrl, {
                    replace_original: true,
                    text: '⏳ 유효시간(1분)이 지나 만료된 기능입니다.',
                    response_type: 'ephemeral'
                });
                return;
            }
        }

        const io = HypervSocketService.getIo();
        let phoneName = 'Unknown';
        let targetHostname = '';
        let requesterHostname = '';
        let requesterName = '';

        try {
            const data = JSON.parse(value);
            phoneName = data.phoneName;
            targetHostname = data.targetHostname;
            requesterHostname = data.requesterHostname;
            requesterName = data.requesterName;
        } catch (e) {
            logger.warn('Failed to parse slack action value');
        }

        const approverName = await slackClient.getDisplayName(payload.user?.id);

        if (io) {
            if (requesterHostname) {
                io.to(requesterHostname).emit('otp-connect-request', {
                    phoneName,
                    requesterName,
                    requesterHostname: requesterHostname ?? null,
                    approverName
                });
            } else {
                io.emit('otp-connect-request', phoneName);
            }

            if (targetHostname) {
                io.to(targetHostname).emit('otp-disconnect-request', {
                    phoneName,
                    requesterName,
                    requesterHostname: requesterHostname ?? null,
                    approverName
                });
            } else {
                io.emit('otp-disconnect-request', phoneName);
            }
        }

        await apiClient.post(responseUrl, {
            replace_original: true,
            text: `휴대폰 점유 요청이 승인되었습니다. (요청자: ${requesterName})`,
            response_type: 'ephemeral'
        });

        if (requesterHostname) {
            try {
                const reqUser = await schemas.users.model.findOne({hostname: requesterHostname}).select('slackId').lean();
                if (reqUser && reqUser.slackId) {
                    await slackClient.sendMessage({
                        channelId: reqUser.slackId,
                        message: `*[접속 승인]*\n요청하신 \`${phoneName}\` 사용 점유 요청을 \`${approverName}\`님이 승인했습니다!`
                    });
                }
            } catch (error) {
                logger.error('요청자에게 슬랙 메시지 전송 실패', error);
            }
        }
    }

    static async handleDenyAction(payload: any, value: string, responseUrl: string, slackClient: SlackMessenger) {
        const messageTs = payload.message?.ts || payload.container?.message_ts;
        if (messageTs) {
            if (dateUtil.isUnixSecondsExpired(messageTs, 60)) {
                await apiClient.post(responseUrl, {
                    replace_original: true,
                    text: '⏳ 유효시간(1분)이 지나 만료된 기능입니다.',
                    response_type: 'ephemeral'
                });
                return;
            }
        }

        let phoneName = 'Unknown';
        let requesterHostname = '';
        let requesterName = '';

        try {
            const data = JSON.parse(value);
            phoneName = data.phoneName;
            requesterHostname = data.requesterHostname;
            requesterName = data.requesterName;
        } catch (e) {
            logger.warn('Failed to parse slack action value');
        }

        const approverName = await slackClient.getDisplayName(payload.user?.id);

        await apiClient.post(responseUrl, {
            replace_original: true,
            text: `휴대폰 점유 요청이 거부되었습니다. (요청자: ${requesterName})`,
            response_type: 'ephemeral'
        });

        if (requesterHostname) {
            try {
                const reqUser = await schemas.users.model.findOne({hostname: requesterHostname}).select('slackId').lean();
                if (reqUser && reqUser.slackId) {
                    await slackClient.sendMessage({
                        channelId: reqUser.slackId,
                        message: `*[접속 거부]*\n요청하신 \`${phoneName}\` 사용 점유 요청을 \`${approverName}\`님이 거부했습니다.`
                    });
                }
            } catch (error) {
                logger.error('요청자에게 슬랙 메시지 전송 실패', error);
            }
        }
    }
}
