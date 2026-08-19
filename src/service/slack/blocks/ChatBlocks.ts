/**
 * ChatBlocks - RAG 챗봇 답변용 슬랙 블록
 */
export const ChatBlocks = {
    buildAnswerBlocks(
        question: string,
        answer: string,
        sources?: Array<{source: string; score: number; preview: string}>,
        shareValue?: string
    ): any[] {
        const blocks: any[] = [
            {
                type: 'section',
                text: {type: 'mrkdwn', text: `*질문*\n${question}`}
            },
            {
                type: 'section',
                // 슬랙 section 텍스트는 3000자 제한 → 혹시 넘치면 잘라줌
                text: {type: 'mrkdwn', text: `*답변*\n${(answer || '(응답 없음)').slice(0, 2900)}`}
            }
        ];

        // ▼▼▼ "참고한 자료"(원문 미리보기) — 보안상 기본 비활성화.
        //     다시 보고 싶으면 아래 블록 주석만 풀면 됨. ▼▼▼
        // if (sources && sources.length) {
        //     const srcText = sources.map((s, i) => `${i + 1}. \`${s.source}\` ${s.preview}`).join('\n');
        //     blocks.push({type: 'divider'});
        //     blocks.push({
        //         type: 'context',
        //         elements: [{type: 'mrkdwn', text: `*참고한 자료 ${sources.length}건*\n${srcText}`.slice(0, 3000)}]
        //     });
        // }
        // ▲▲▲ 여기까지 ▲▲▲

        // "채널에 공유" 버튼 — 누르면 개인용(ephemeral) 답변을 채널 전체(in_channel)로 재게시.
        // value에 답변(JSON)을 직접 실어 payload로 왕복시킨다(ephemeral은 원본 블록을 안 돌려주므로).
        // shareValue 없으면 버튼 미부착. 공유된(재구성) 메시지도 shareValue 없이 불러 버튼이 빠진다.
        if (shareValue) {
            blocks.push({
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {type: 'plain_text', text: '📢 채널에 공유', emoji: true},
                        action_id: 'share_chat',
                        value: shareValue,
                        style: 'primary'
                    }
                ]
            });
        }

        return blocks;
    }
};

