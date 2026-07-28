export const OtpRequestBlocks = {
    buildRequestBlocks(requestInfo?: any): any[] {
        const blocks: any[] = [];

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*새로운 휴대폰(OTP) 사용 점유 요청이 도착했습니다.*`
            }
        });

        if (requestInfo) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*요청자:* ${requestInfo.requester || '알 수 없음'}\n*사유:* ${requestInfo.reason || '내용 없음'}`
                }
            });
        }

        const payloadValue = requestInfo
            ? JSON.stringify({
                  phoneName: requestInfo.phoneName,
                  targetHostname: requestInfo.targetHostname,
                  requesterHostname: requestInfo.requesterHostname,
                  requesterName: requestInfo.requester
              })
            : 'unknown';

        const buttons = [
            {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: '✅ 승인',
                    emoji: true
                },
                value: payloadValue,
                action_id: 'otp_request_approve',
                style: 'primary'
            },
            {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: '❌ 거부',
                    emoji: true
                },
                value: payloadValue,
                action_id: 'otp_request_deny',
                style: 'danger'
            }
        ];

        blocks.push({
            type: 'actions',
            elements: buttons
        });

        return blocks;
    }
};

