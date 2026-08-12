/**
 * RagChatService - RAG 챗봇 오케스트레이션 (앱 런타임용)
 * ------------------------------------------------------------------
 * 질문 → (임베딩) → 벡터검색 → 프롬프트 구성 → LLM 답변 생성.
 * provider는 LLMFactory를 통해서만 가져오므로 OpenAI/Gemini 교체가 자유롭다.
 */
import LLMFactory, {LLMType} from './LLMFactory.js';
import VectorSearchService, {VectorHit} from './VectorSearchService.js';
import PromptService from './PromptService.js';
import {buildToolExecutor, ToolDef} from './RagToolExecutor.js';
import type {ChatMessage, ToolExecutor, ToolFunctionSpec} from './types.js';
import {DBLogger} from '../../utils/DBLogger.js';

/**
 * 랭퓨즈 미설정/장애 시 사용할 하드코딩 fallback 시스템 프롬프트.
 * 평상시엔 랭퓨즈 'rag-system-prompt'(production)를 우선 사용하고, 이건 최후의 보루.
 * 정책: 사내 데이터는 참고 문서에 근거, 일반 지식·기술 질문은 LLM 지식으로 답변 허용(회사 고유 정보만 지어내지 않음).
 */
const FALLBACK_SYSTEM_PROMPT =
    '너는 Unipost 사내 지식 어시스턴트야. 다음 규칙을 지켜서 한국어로 간결하게 답해:\n' +
    '1) 인사·감사·가벼운 잡담이나 너(어시스턴트)에 대한 질문에는 자연스럽고 친근하게 답해.\n' +
    '2) 질문이 사내 데이터·업무 지식에 관한 것이면 아래 "참고 문서"를 최우선 근거로 삼아 답해. ' +
    '회사 고유의 사실(고객사·서버·계정·사내 규정 등)은 참고 문서에 있는 내용만 사용하고, ' +
    '문서에 없으면 지어내지 말고 "제공된 자료에서 찾을 수 없습니다"라고 답해.\n' +
    '3) 참고 문서와 무관한 일반 지식·기술 질문(예: 리눅스 명령어, 프로그래밍, 개념 설명 등)이면 ' +
    '네가 알고 있는 지식으로 정확하고 친절하게 답해도 돼. 단, 회사 고유 정보를 임의로 지어내지만 마.\n' +
    '4) 문서 속 값이 축약·코드 형태면 사람이 읽기 쉽게 풀어서 답해. ' +
    '예: 생일(birthDate) "0324"는 "3월 24일"로, 날짜는 자연스러운 한국어 형식으로 변환해서 답해.';

export interface RagAskOptions {
    topK?: number;
    source?: string;
    chatProvider?: LLMType;
    embeddingProvider?: LLMType;
    /** 로그용 메타: 누가(user) 어디서(via: 'slack' | 'api' 등) 질문했는지 */
    meta?: {user?: string; via?: string};
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

        // 프롬프트 + config(tools/temperature 등)를 랭퓨즈에서 로드 (실패 시 fallback)
        const {text: systemText, config} = await PromptService.getPrompt('rag-system-prompt', FALLBACK_SYSTEM_PROMPT, {});
        const tools: ToolDef[] = Array.isArray(config?.tools) ? config.tools : [];

        // ── [경로 A] 함수호출(tool calling) ─────────────────────────────
        // config에 tools가 정의돼 있고 provider가 함수호출을 지원하면,
        // LLM이 스스로 어떤 도구(생일검색/부서검색/벡터검색…)를 부를지 결정한다.
        if (tools.length && llm.chatWithTools) {
            const declarations: ToolFunctionSpec[] = tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }));
            const execute = buildToolExecutor(tools, embedder);
            // 어떤 도구가 호출됐는지 로그용으로 기록 (실행은 그대로 위임)
            const calledTools: string[] = [];
            const trackedExecute: ToolExecutor = (name, args) => {
                calledTools.push(name);
                return execute(name, args);
            };
            const answer = await llm.chatWithTools(systemText, question, declarations, trackedExecute, {
                temperature: config?.temperature
            });
            await this.logQa(question, answer, options.meta, {path: 'tool', tools: calledTools});
            return {answer, sources: []};
        }

        // ── [경로 B] 기존 RAG (질문 임베딩 → 벡터검색 → 답변) ───────────────
        const queryVector = await embedder.embed(question, 'query');
        const hits: VectorHit[] = await VectorSearchService.search(queryVector, {
            topK: options.topK ?? 5,
            source: options.source
        });

        // 검색 결과가 없어도 일반 지식·기술 질문엔 LLM이 답할 수 있으므로 조기 반환하지 않는다.
        const context = hits.length ? hits.map((h, i) => `[문서 ${i + 1}] ${h.text}`).join('\n\n') : '(관련 사내 문서 없음)';

        const messages: ChatMessage[] = [
            {role: 'system', content: systemText},
            {role: 'user', content: `참고 문서:\n${context}\n\n질문: ${question}`}
        ];
        const answer = await llm.chat(messages);

        await this.logQa(question, answer, options.meta, {path: 'vector', sources: hits.map((h) => h.source)});

        return {
            answer,
            sources: hits.map((h) => ({
                source: h.source,
                score: Number((h.score ?? 0).toFixed(3)),
                preview: (h.text || '').replace(/\n/g, ' ').slice(0, 80)
            }))
        };
    }

    /**
     * 질의응답 로그(DB + 파일). 누가/어디서/무슨 질문/무슨 답변/어느 경로(도구·벡터)인지 기록.
     * 실패해도 답변 흐름을 막지 않도록 내부에서 조용히 흡수한다.
     */
    private static async logQa(question: string, answer: string, meta: RagAskOptions['meta'], extra: {path: 'tool' | 'vector'; tools?: string[]; sources?: string[]}): Promise<void> {
        try {
            await DBLogger.log({
                category: 'DATA',
                action: 'RAG 챗봇 질의응답',
                actionType: 'READ',
                target: extra.path === 'tool' ? (extra.tools?.join(',') || '(no-tool)') : 'searchDocs(vector)',
                userId: meta?.user || meta?.via || 'API',
                details: {
                    via: meta?.via,
                    question,
                    answer: (answer || '').slice(0, 2000),
                    path: extra.path,
                    tools: extra.tools,
                    sources: extra.sources
                }
            });
        } catch {
            /* 로깅 실패는 무시 (답변엔 영향 없음) */
        }
    }
}

export default RagChatService;

