/**
 * ChatBlocks - RAG 챗봇 답변용 슬랙 블록
 */
export const ChatBlocks = {
    buildAnswerBlocks(question: string, answer: string, sources?: Array<{source: string; score: number; preview: string}>): any[] {
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

        return blocks;
    }
};

