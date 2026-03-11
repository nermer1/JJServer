import ApiReturn from '../../../structure/ApiReturn.js';

export const OtpBlocks = {
    buildOtpBlocks(otpList: ApiReturn, actionId?: string): any[] {
        const {timeUse} = otpList.getReturnData();
        const otpData = otpList.getTableData();
        const now = new Date();
        const remainSeconds = 30 - Number(timeUse);
        const expiryTime = new Date(now.getTime() + remainSeconds * 1000);

        // 시간 포맷팅 (HH:mm:ss)
        const expiryStr = expiryTime.toTimeString().split(' ')[0];

        // 블록 조립
        const blocks: any[] = [];

        // 새로고침, 공유에 다른 보여주기 분기
        if (actionId !== 'share_otp') {
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

        otpData.forEach((item: any) => {
            const [companyName, users] = Object.entries(item)[0] as [string, any[]];

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

            blocks.push({
                type: 'actions',
                elements: buttons
            });

            blocks.push({type: 'divider'});
        });

        return blocks;
    }
};
