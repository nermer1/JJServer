/**
 * LangfuseTracer - 챗봇 Q&A를 Langfuse 대시보드에 "trace"로 기록 (관측성)
 * ------------------------------------------------------------------
 * 목적: 환각/오판 답변을 나중에 시간·내용으로 찾아, 질문·답변·도구결과를 보고
 *       프롬프트/도구를 개선하기 위함. (우리 auditLog(BOT)와 별개 — 이건 LLM 관측용)
 *
 * ⚠️ 트레이싱 실패는 절대 답변 흐름을 막지 않는다(전부 try/catch + no-op).
 * ⚠️ 설정(LANGFUSE_*)이 없으면 조용히 비활성.
 * ⚠️ 클라이언트는 "호출 시점"에 지연 생성한다 (모듈 로드 시점엔 loadSettings 전이라 키가 비어있음).
 */
import logger from '../../utils/logger.js';
import {getLangfuseClient} from './langfuseClient.js';

/** 값이 너무 크면 잘라서(진단엔 충분) 대시보드/전송 부담 방지 */
function cap(value: any, max = 2000): any {
    try {
        const s = typeof value === 'string' ? value : JSON.stringify(value);
        return s.length > max ? s.slice(0, max) + `…(${s.length}자)` : value;
    } catch {
        return String(value);
    }
}

export interface ChatTraceData {
    question: string;
    answer: string;
    user?: string;
    via?: string; // 'slack' | 'api'
    path: 'tool' | 'vector';
    model?: string; // provider 식별자 등
    promptLabel?: string;
    toolCalls?: Array<{name: string; args: any; result: any}>;
    sources?: string[];
    /** 랭퓨즈 프롬프트 객체 (PromptService.getPrompt의 promptObj) — generation에 연동해 프롬프트 버전 추적 */
    promptObj?: any;
}

/** 챗봇 1턴을 Langfuse trace(+generation)로 기록. 실패/미설정이면 조용히 무시. */
export function traceChat(data: ChatTraceData): void {
    const lf = getLangfuseClient();
    if (!lf) {
        logger.warn('[LangfuseTracer] 클라이언트 없음 — LANGFUSE_HOST/PUBLIC_KEY/SECRET_KEY 미설정? → trace 스킵');
        return;
    }

    try {
        const trace = lf.trace({
            name: 'rag-chat',
            input: data.question,
            output: data.answer,
            userId: data.user,
            tags: [data.path, data.via].filter(Boolean) as string[],
            metadata: {
                via: data.via,
                path: data.path,
                model: data.model,
                // 어떤 도구를 무슨 인자로 불러 무엇이 나왔는지 → 환각 진단 핵심 자료
                toolCalls: data.toolCalls?.map((t) => ({name: t.name, args: t.args, result: cap(t.result)})),
                sources: data.sources
            }
        });

        // LLM 호출을 generation으로 기록 + 프롬프트 버전 연동 (어느 프롬프트가 이 답을 냈는지)
        trace.generation({
            name: 'llm-answer',
            model: data.model,
            input: data.question,
            output: data.answer,
            ...(data.promptObj ? {prompt: data.promptObj} : {})
        });

        // 배칭된 이벤트를 비동기로 전송 (응답 지연 없도록 fire-and-forget)
        // ⚠️ flush 에러를 로깅해서 "왜 대시보드에 안 뜨는지" 원인 확인 (auth 401/baseUrl/네트워크 등)
        lf.flushAsync()
            .then(() => logger.info('[LangfuseTracer] trace flush 완료'))
            .catch((e: any) => logger.warn(`[LangfuseTracer] flush 실패: ${e?.message || e}`));
    } catch (e: any) {
        logger.warn(`[LangfuseTracer] trace 전송 실패: ${e?.message || e}`);
    }
}
