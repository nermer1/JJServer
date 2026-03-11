export const HelpBlocks = {
    buildHelpBlocks(): any[] {
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
};
