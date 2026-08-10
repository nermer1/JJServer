/**
 * RagChatService - RAG 챗봇 오케스트레이션 (앱 런타임용)
 * ------------------------------------------------------------------
 * 질문 → (임베딩) → 벡터검색 → 프롬프트 구성 → LLM 답변 생성.
 * provider는 LLMFactory를 통해서만 가져오므로 OpenAI/Gemini 교체가 자유롭다.
 */
import LLMFactory, {LLMType} from './LLMFactory.js';
import VectorSearchService, {VectorHit} from './VectorSearchService.js';
import type {ChatMessage} from './types.js';

export interface RagAskOptions {
    topK?: number;
    source?: string;
    chatProvider?: LLMType;
    embeddingProvider?: LLMType;
}

export interface RagSource {
    source: string;
    score: number;
    preview: string;
}

export interface RagAnswer {
    answer: string;
    sources: RagSource[];
}

class RagChatService {
    static async ask(question: string, options: RagAskOptions = {}): Promise<RagAnswer> {
        const embedder = LLMFactory.createEmbedding(options.embeddingProvider);
        const llm = LLMFactory.createChat(options.chatProvider);

        // 1) 질문 임베딩 (질의용)
        const queryVector = await embedder.embed(question, 'query');

        // 2) 벡터 검색
        const hits: VectorHit[] = await VectorSearchService.search(queryVector, {
            topK: options.topK ?? 5,
            source: options.source
        });

        if (!hits.length) {
            return {answer: '제공된 자료에서 관련 내용을 찾을 수 없습니다.', sources: []};
        }

        // 3) 프롬프트 구성 + 답변 생성
        const context = hits.map((h, i) => `[문서 ${i + 1}] ${h.text}`).join('\n\n');
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content:
                    '너는 Unipost 사내 지식 어시스턴트야. 다음 규칙을 지켜서 한국어로 간결하게 답해:\n' +
                    '1) 인사·감사·가벼운 잡담이나 너(어시스턴트)에 대한 질문에는 자연스럽고 친근하게 답해.\n' +
                    '2) 사내 데이터·업무 지식에 대한 질문이면 아래 "참고 문서"에 근거해서만 답하고, ' +
                    '근거가 없으면 지어내지 말고 "제공된 자료에서 찾을 수 없습니다"라고 답해.\n' +
                    '3) 사내 자료와 무관한 일반 상식·외부 정보 질문에는 "사내 자료를 기반으로 답하는 어시스턴트예요"라고 정중히 안내해.\n' +
                    '4) 문서 속 값이 축약·코드 형태면 사람이 읽기 쉽게 풀어서 답해. ' +
                    '예: 생일(birthDate) "0324"는 "3월 24일"로, 날짜는 자연스러운 한국어 형식으로 변환해서 답해.'
            },
            {
                role: 'user',
                content: `참고 문서:\n${context}\n\n질문: ${question}`
            }
        ];
        const answer = await llm.chat(messages);

        return {
            answer,
            sources: hits.map((h) => ({
                source: h.source,
                score: Number((h.score ?? 0).toFixed(3)),
                preview: (h.text || '').replace(/\n/g, ' ').slice(0, 80)
            }))
        };
    }
}

export default RagChatService;
