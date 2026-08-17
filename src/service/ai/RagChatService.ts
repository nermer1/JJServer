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
import ChatHistoryService from './ChatHistoryService.js';
import {traceChat} from './LangfuseTracer.js';
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
    /** 단기 대화 기억 사용 여부 (기본 true). 슬랙 등 단타성 채널은 false로 꺼서 문맥 없이 1회성 답변. */
    useMemory?: boolean;
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
        const embedder = LLMFactory.createEmbedding();
        const llm = LLMFactory.createChat();

        // 프롬프트 + config(tools/temperature 등)를 랭퓨즈에서 로드 (실패 시 fallback)
        const {text: systemText, config, promptObj} = await PromptService.getPrompt('rag-system-prompt', FALLBACK_SYSTEM_PROMPT, {});
        const tools: ToolDef[] = Array.isArray(config?.tools) ? config.tools : [];

        // 단기 대화 기억: 켜져 있으면(기본) 이 사용자의 최근 대화(최대 5턴)를 불러와 현재 질문 앞에 붙인다.
        // 슬랙 등 단타성 채널은 useMemory:false → 기억 로드/저장 모두 건너뜀 (로깅은 그대로).
        const remember = options.useMemory !== false;
        const history: ChatMessage[] = remember ? await ChatHistoryService.recent(options.meta?.user) : [];

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
            // 어떤 도구를 무슨 인자로 불러 무엇이 나왔는지 기록 (로그 + 랭퓨즈 trace 진단용)
            const toolCalls: Array<{name: string; args: any; result: any}> = [];
            const trackedExecute: ToolExecutor = async (name, args) => {
                const result = await execute(name, args);
                toolCalls.push({name, args, result});
                return result;
            };
            const answer = await llm.chatWithTools(systemText, question, declarations, trackedExecute, {
                temperature: config?.temperature,
                history // 최근 대화를 현재 질문 앞에 주입 (provider가 처리)
            });
            if (remember) await ChatHistoryService.save(options.meta?.user, question, answer);
            await this.logQa(question, answer, options.meta, {path: 'tool', tools: toolCalls.map((t) => t.name)});
            traceChat({question, answer, user: options.meta?.user, via: options.meta?.via, path: 'tool', model: llm.name, toolCalls, promptObj});
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
            ...history, // 최근 대화(user/assistant)를 현재 질문 앞에 주입
            {role: 'user', content: `참고 문서:\n${context}\n\n질문: ${question}`}
        ];
        const answer = await llm.chat(messages);

        if (remember) await ChatHistoryService.save(options.meta?.user, question, answer);
        await this.logQa(question, answer, options.meta, {path: 'vector', sources: hits.map((h) => h.source)});
        traceChat({question, answer, user: options.meta?.user, via: options.meta?.via, path: 'vector', model: llm.name, sources: hits.map((h) => h.source), promptObj});

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
    private static async logQa(
        question: string,
        answer: string,
        meta: RagAskOptions['meta'],
        extra: {path: 'tool' | 'vector'; tools?: string[]; sources?: string[]}
    ): Promise<void> {
        try {
            // 챗봇 전용 로거(category='BOT'). userId 는 JWT 유저(없으면 via/'API').
            await DBLogger.bot(
                'RAG 챗봇 질의응답',
                {
                    via: meta?.via,
                    question,
                    answer: (answer || '').slice(0, 2000),
                    path: extra.path,
                    target: extra.path === 'tool' ? extra.tools?.join(',') || '(no-tool)' : 'searchDocs(vector)',
                    tools: extra.tools,
                    sources: extra.sources
                },
                meta?.user || meta?.via || 'API'
            );
        } catch {
            /* 로깅 실패는 무시 (답변엔 영향 없음) */
        }
    }
}

export default RagChatService;

