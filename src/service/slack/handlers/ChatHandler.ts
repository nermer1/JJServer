/**
 * ChatHandler - 슬랙 RAG 챗봇 커맨드 핸들러
 * ------------------------------------------------------------------
 * 슬래시 커맨드(예: /ask 질문내용)를 받아서 RagChatService로 답변을 만들고
 * response_url 로 결과를 보낸다.
 *
 * (슬랙 3초 제한 때문에 SlackRouter에서 먼저 200 ack을 보내고,
 *  여기서는 시간이 걸리는 RAG 처리 후 response_url 로 지연 응답한다.)
 */
import {Request} from 'express';
import {apiClient} from '../../../modules/httpClient/ApiClient.js';
import RagChatService from '../../ai/RagChatService.js';
import {ChatBlocks} from '../blocks/ChatBlocks.js';
import logger from '../../../utils/logger.js';

/** 슬랙 버튼 value 최대 2000자 → 여유를 두고 제한 */
const SHARE_VALUE_MAX = 1900;

/**
 * 공유 버튼 value 생성: 답변을 payload에 직접 실어보낸다(별도 저장소 불필요).
 * 2000자 제한이 있어, 초과하면 답변만 잘라 담는다(원본 개인메시지엔 전체 답변이 그대로 보임).
 */
function buildShareValue(question: string, answer: string): string {
    const full = JSON.stringify({q: question, a: answer});
    if (full.length <= SHARE_VALUE_MAX) return full;

    const overhead = JSON.stringify({q: question, a: ''}).length; // 질문+JSON 구조가 차지하는 길이
    const room = Math.max(0, SHARE_VALUE_MAX - overhead - 12); // '…(생략)' 여유
    return JSON.stringify({q: question, a: answer.slice(0, room) + '…(생략)'});
}

export class ChatHandler {
    static async handleCommand(req: Request): Promise<void> {
        const {text, response_url, user_id} = req.body;
        const question = (text || '').trim();

        // 질문이 비어있으면 사용법 안내
        if (!question) {
            await apiClient.post(response_url, {
                response_type: 'ephemeral',
                replace_original: true,
                text: '질문을 입력해줘. 예) `/ask 네트워크 인터페이스 설정하는 리눅스 명령어가 뭐야?`'
            });
            return;
        }

        try {
            // 슬랙은 단타성(1회성)이라 대화 기억은 끔(useMemory:false). 로깅(누가/무엇)은 그대로 남음.
            const result = await RagChatService.ask(question, {topK: 5, meta: {user: user_id, via: 'slack'}, useMemory: false});

            // 공유 버튼용: 답변을 버튼 value에 직접 담는다(ephemeral은 클릭 시 원본 블록을 안 돌려줌)
            const shareValue = buildShareValue(question, result.answer);

            await apiClient.post(response_url, {
                // 나만 보기: 'ephemeral' / 채널 전체 공유: 'in_channel'
                response_type: 'ephemeral',
                replace_original: true,
                blocks: ChatBlocks.buildAnswerBlocks(question, result.answer, result.sources, shareValue)
            });
        } catch (error: any) {
            logger.error(`[ChatHandler] 오류: ${error?.message || error}`);
            await apiClient.post(response_url, {
                response_type: 'ephemeral',
                replace_original: true,
                text: `답변 생성 중 오류가 발생했어: ${error?.message || '알 수 없는 오류'}`
            });
        }
    }

    /**
     * "📢 채널에 공유" 버튼 처리.
     * 슬랙은 개인용(ephemeral) 메시지를 그 자리에서 전체 공개로 "승격"시킬 수 없고,
     * 클릭 payload에 원본 블록도 안 실어준다. → 버튼 value(JSON)에 담아 보낸 답변을 파싱해
     * 채널 전체(in_channel)에 "새 메시지"로 재게시하고, 원본 개인 메시지는 "공유됨"으로
     * 갱신해 버튼을 없앤다(중복 공유 방지).
     * @param value 버튼 value = {q, a} JSON (답변 원문을 payload로 왕복시킨 것)
     */
    static async handleShareAction(payload: any, value: string, responseUrl: string): Promise<void> {
        try {
            let parsed: {q: string; a: string} | null = null;
            try {
                parsed = JSON.parse(value);
            } catch {
                parsed = null;
            }

            if (!parsed?.a) {
                await apiClient.post(responseUrl, {
                    response_type: 'ephemeral',
                    replace_original: true,
                    text: '공유에 실패했어. (공유할 답변을 읽지 못함)'
                });
                return;
            }

            // 버튼 없는 답변 블록으로 재구성(shareValue 미전달 → 공유 버전엔 공유 버튼 미포함)
            const shareBlocks = ChatBlocks.buildAnswerBlocks(parsed.q, parsed.a);

            // 누가 공유했는지 표시
            const sharer = payload?.user?.id;
            if (sharer) {
                shareBlocks.push({
                    type: 'context',
                    elements: [{type: 'mrkdwn', text: `🔗 <@${sharer}> 님이 공유`}]
                });
            }

            // 1) 채널 전체 공개 메시지로 게시 (replace_original:false = 새 메시지)
            await apiClient.post(responseUrl, {
                response_type: 'in_channel',
                replace_original: false,
                text: '채널에 공유된 답변',
                blocks: shareBlocks
            });

            // 2) 원본 개인 메시지는 '공유됨'으로 갱신 → 버튼 제거(중복 공유 방지)
            await apiClient.post(responseUrl, {
                response_type: 'ephemeral',
                replace_original: true,
                text: '✅ 이 답변을 채널에 공유했어요.'
            });
        } catch (error: any) {
            logger.error(`[ChatHandler] 공유 처리 오류: ${error?.message || error}`);
        }
    }
}

