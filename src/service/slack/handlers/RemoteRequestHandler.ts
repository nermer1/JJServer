import {Request, Response} from 'express';
import {apiClient} from '../../../modules/httpClient/ApiClient.js';
import {SlackMessenger} from '../../../messenger/slack/SlackMessenger.js';
import {RemoteRequestBlocks} from '../blocks/RemoteRequestBlocks.js';
import HypervSocketService from '../../HypervSocketService.js';
import {schemas} from '../../../schemas/schemaMap.js';
import {dateUtil} from '../../../utils/Utils.js';
import logger from '../../../utils/logger.js';
import {SlackActionHelper} from '../SlackActionHelper.js';

export class RemoteRequestHandler {
    static async handleApproveAction(payload: any, value: string, responseUrl: string, slackClient: SlackMessenger) {
        if (await SlackActionHelper.isActionExpired(payload, responseUrl, 60)) {
            return;
        }

        const io = HypervSocketService.getIo();
        let vmName = 'Unknown';
        let targetHostname = '';
        let requesterHostname = '';
        let requesterName = '';

        try {
            const data = JSON.parse(value);
            vmName = data.vmName;
            targetHostname = data.targetHostname;
            requesterHostname = data.requesterHostname;
            requesterName = data.requesterName;
        } catch (e) {
            logger.warn('Failed to parse slack action value');
        }

        const approverName = await slackClient.getDisplayName(payload.user?.id);

        // 핸드오버 상태 및 대기열 업데이트
        if (requesterHostname) {
            HypervSocketService.markAsAccepted(vmName, requesterHostname, 'VM');
        }

        if (io) {
            // 해당 VM을 소유한 대상 호스트(targetHostname)의 소켓 방으로 직접 이벤트 송신 (객체 포맷팅)
            if (requesterHostname) {
                io.to(requesterHostname).emit('vm-connect-request', {
                    vmName,
                    requesterName,
                    requesterHostname: requesterHostname ?? null,
                    approverName // 승인자 정보도 함께 전달
                });
            } else {
                // fall-back: 대상 호스트를 모르면 예전처럼 브로드캐스트
                io.emit('vm-connect-request', vmName);
            }

            if (targetHostname) {
                io.to(targetHostname).emit('vm-disconnect-request', {
                    vmName,
                    requesterName,
                    requesterHostname: requesterHostname ?? null,
                    approverName
                });
            } else {
                io.emit('vm-disconnect-request', vmName);
            }

            // 요청자의 소켓 방으로 처리 결과와 승인자 정보 전달
            /* if (requesterHostname) {
                io.to(requesterHostname).emit('request-result', {
                    vmName,
                    accepted: true,
                    approver: approverName
                });
            } */
        }

        // 슬랙 메시지 업데이트 (본인 채팅창)
        await apiClient.post(responseUrl, {
            replace_original: true,
            text: `원격 접속 요청이 승인되었습니다. (요청자: ${requesterName})`,
            response_type: 'ephemeral'
        });

        // 원격 접속을 요청했던 요청자(requester)에게 슬랙 메시지 다이렉트 발송
        if (requesterHostname) {
            try {
                const reqUser = await schemas.users.model.findOne({hostname: requesterHostname}).select('slackId').lean();
                if (reqUser && reqUser.slackId) {
                    await slackClient.sendMessage({
                        channelId: reqUser.slackId,
                        message: `*[접속 승인]*\n요청하신 \`${vmName}\` 원격 접속 요청을 \`${approverName}\`님이 승인했습니다!`
                    });
                }
            } catch (error) {
                logger.error('요청자에게 슬랙 메시지 전송 실패', error);
            }
        }
    }

    static async handleDenyAction(payload: any, value: string, responseUrl: string, slackClient: SlackMessenger) {
        if (await SlackActionHelper.isActionExpired(payload, responseUrl, 60)) {
            return;
        }

        const io = HypervSocketService.getIo();
        let vmName = 'Unknown';
        let targetHostname = '';
        let requesterHostname = '';
        let requesterName = '';

        try {
            const data = JSON.parse(value);
            vmName = data.vmName;
            targetHostname = data.targetHostname;
            requesterHostname = data.requesterHostname;
            requesterName = data.requesterName;
        } catch (e) {
            logger.warn('Failed to parse slack action value');
        }

        const approverName = await slackClient.getDisplayName(payload.user?.id);

        /* if (io) {
            // 거부 시 타겟 호스트에 disconnect 또는 결과 송신
            if (targetHostname) {
                io.to(targetHostname).emit('vm-disconnect-request', {
                    vmName,
                    requesterName,
                    requesterHostname: requesterHostname ?? null,
                    approverName
                });
            } else {
                io.emit('vm-disconnect-request', vmName);
            }

            // 요청자의 소켓 방으로 처리 결과와 승인자(거부자) 정보 전달
            if (requesterHostname) {
                io.to(requesterHostname).emit('request-result', {
                    vmName,
                    accepted: false,
                    approver: approverName
                });
            }
        } */

        // 본인 화면(거부자) 버튼을 메시지로 대체
        await apiClient.post(responseUrl, {
            replace_original: true,
            text: `원격 접속 요청이 거부되었습니다. (요청자: ${requesterName})`,
            response_type: 'ephemeral'
        });

        // 원격 접속을 요청했던 요청자(requester)에게 통보 (슬랙 메시지 직접 발송)
        if (requesterHostname) {
            try {
                const reqUser = await schemas.users.model.findOne({hostname: requesterHostname}).select('slackId').lean();
                if (reqUser && reqUser.slackId) {
                    await slackClient.sendMessage({
                        channelId: reqUser.slackId,
                        message: `*[접속 거부]*\n요청하신 \`${vmName}\` 원격 접속 요청을 \`${approverName}\`님이 거부했습니다.`
                    });
                }
            } catch (error) {
                logger.error('요청자에게 슬랙 메시지 전송 실패', error);
            }
        }
    }

    // (참고) 원격 요청 버튼 블록을 띄워주는 테스트용/명령어용 함수가 필요하다면 아래처럼 구성할 수 있습니다.
    static async handleCommand(req: Request, res: Response) {
        const {response_url} = req.body;

        // 예시용 데이터
        const requestInfo = {
            requester: 'user_A',
            reason: '서버 점검 및 로그 확인'
        };

        const blocks = RemoteRequestBlocks.buildRequestBlocks(requestInfo);

        await apiClient.post(response_url, {
            replace_original: true,
            text: '원격 접속 요청 알림',
            response_type: 'in_channel',
            blocks
        });
    }

    static async handleWaitlistConnectAction(payload: any, value: string, responseUrl: string, slackClient: SlackMessenger) {
        if (await SlackActionHelper.isActionExpired(payload, responseUrl, 60)) {
            return;
        }

        let targetName = 'Unknown';
        let type = 'VM';
        let requesterHostname = '';
        let requesterName = '';

        try {
            const data = JSON.parse(value);
            targetName = data.targetName;
            type = data.type;
            requesterHostname = data.requesterHostname;
            requesterName = data.requesterName;
        } catch (e) {
            logger.warn('Failed to parse waitlist connect action value');
        }

        const io = HypervSocketService.getIo();
        if (io && requesterHostname) {
            if (type === 'VM') {
                io.to(requesterHostname).emit('vm-connect-request', {
                    vmName: targetName,
                    requesterName,
                    requesterHostname
                });
            } else if (type === 'OTP') {
                io.to(requesterHostname).emit('otp-connect-request', {
                    phoneName: targetName,
                    requesterName,
                    requesterHostname
                });
            }
        }

        // 버튼을 누른 슬랙 메시지를 클릭 피드백 텍스트로 교체
        await apiClient.post(responseUrl, {
            replace_original: true,
            text: `[접속완료] \`${targetName}\` ${type}`,
            response_type: 'ephemeral'
        });
    }
}
