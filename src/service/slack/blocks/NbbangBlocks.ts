export const NbbangBlocks = {
    buildModalView(responseUrl: string): any {
        return {
            type: 'modal',
            callback_id: 'nbbang_modal_submit',
            private_metadata: responseUrl,
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
                },
                {
                    type: 'input',
                    block_id: 'dm_check_block',
                    optional: true,
                    element: {
                        type: 'checkboxes',
                        action_id: 'dm_check_action',
                        options: [
                            {
                                text: {
                                    type: 'plain_text',
                                    text: '정산 대상자들에게 개별 DM을 발송합니다.'
                                },
                                value: 'send_dm'
                            }
                        ]
                    },
                    label: {type: 'plain_text', text: '개별 메시지 발송'}
                }
            ],
            submit: {type: 'plain_text', text: '계산하기'}
        };
    },

    buildResultBlocks(
        titleStr: string,
        detailsStr: string,
        totalAmount: number,
        userCount: number,
        userMentions: string,
        perPerson: number,
        accountStr: string
    ): any[] {
        return [
            {type: 'header', text: {type: 'plain_text', text: `N빵 정산: ${titleStr}`}},
            {
                type: 'section',
                text: {type: 'mrkdwn', text: `*상세 내역*\n${detailsStr}`}
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*총 결제 금액:* ${totalAmount.toLocaleString()}원\n*정산 대상자 (${userCount}명):* ${userMentions}`
                }
            },
            {type: 'divider'},
            {type: 'section', text: {type: 'mrkdwn', text: `*1인당 송금액: ${perPerson.toLocaleString()}원*`}},
            {type: 'divider'},
            {type: 'context', elements: [{type: 'mrkdwn', text: `*입금:* ${accountStr}`}]}
        ];
    }
};
