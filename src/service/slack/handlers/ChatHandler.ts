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

export class ChatHandler {
    static async handleCommand(req: Request): Promise<void> {
        const {text, response_url} = req.body;
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
            const result = await RagChatService.ask(question, {topK: 5});

            await apiClient.post(response_url, {
                // 나만 보기: 'ephemeral' / 채널 전체 공유: 'in_channel'
                response_type: 'ephemeral',
                replace_original: true,
                blocks: ChatBlocks.buildAnswerBlocks(question, result.answer, result.sources)
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
}

