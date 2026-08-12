/**
 * LLM Provider 추상화 - 공통 타입
 * ------------------------------------------------------------------
 * 특정 AI 회사(OpenAI/Gemini/…)에 종속되지 않도록 "무엇을 할 수 있는가"만
 * 인터페이스로 정의한다. 구현체는 providers/ 아래에 회사별로 하나씩 둔다.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface ChatOptions {
    /** 창의성 (0 = 일관적/결정적, 1 = 자유로움). RAG 답변은 보통 낮게. */
    temperature?: number;
    /** 최대 생성 토큰 수 */
    maxTokens?: number;
    /** provider 기본 모델을 이번 호출만 덮어쓰고 싶을 때 */
    model?: string;
}

/**
 * 임베딩 용도. 검색 품질을 위해 "질문"과 "문서"를 구분해서 임베딩한다.
 *  - query    : 사용자 질문 (검색할 때)
 *  - document : 저장할 원본 문서 (인덱싱할 때)
 * (OpenAI는 이 구분이 없어 무시하고, Gemini는 taskType으로 매핑)
 */
export type EmbeddingPurpose = 'query' | 'document';

/** 텍스트를 벡터(임베딩)로 변환하는 provider — "검색"에 사용 */
export interface EmbeddingProvider {
    /** provider 식별자 (예: 'openai') */
    readonly name: string;
    /** 이 provider가 만들어내는 벡터의 차원 수 (Atlas 인덱스 numDimensions와 일치해야 함) */
    readonly dimensions: number;
    /** 텍스트 1건 → 벡터 1개 */
    embed(text: string, purpose?: EmbeddingPurpose): Promise<number[]>;
    /** 텍스트 여러 건 → 벡터 여러 개 (인덱싱 시 대량 처리용) */
    embedBatch(texts: string[], purpose?: EmbeddingPurpose): Promise<number[][]>;
}

// ============ 함수호출(tool calling) 관련 타입 ============

/**
 * LLM에게 넘길 도구(함수) 정의. LLM은 이 스펙만 보고 "어떤 함수를 어떤 인자로 부를지" 결정한다.
 * (실제 구현/실행은 앱 코드가 담당 — 아래 ToolExecutor)
 *   - parameters: JSON Schema (예: {type:'object', properties:{date:{type:'string'}}, required:['date']})
 */
export interface ToolFunctionSpec {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
}

/**
 * LLM이 함수 호출을 요청했을 때, 실제로 그 함수를 실행하는 콜백.
 * @returns 함수 실행 결과(임의 JSON). 이 결과가 다시 LLM에게 전달되어 최종 답변에 반영된다.
 */
export type ToolExecutor = (name: string, args: Record<string, any>) => Promise<any>;

/** 답변 문장을 생성하는 provider — "생성"에 사용 */
export interface ChatProvider {
    /** provider 식별자 (예: 'openai', 'gemini') */
    readonly name: string;
    /** 대화 메시지 배열 → 답변 텍스트 */
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
    /**
     * 함수호출(tool calling)을 지원하는 provider만 구현한다(선택).
     * system + user 질문 + 도구목록 + 실행콜백을 받아, 필요한 도구를 (여러 번) 호출한 뒤 최종 텍스트를 돌려준다.
     * 미구현 provider는 이 속성이 undefined → 호출부가 일반 chat 흐름으로 폴백하면 됨.
     */
    chatWithTools?(systemText: string, userText: string, tools: ToolFunctionSpec[], execute: ToolExecutor, options?: ChatOptions): Promise<string>;
}

