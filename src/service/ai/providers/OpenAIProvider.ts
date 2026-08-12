/**
 * OpenAI Provider 구현체
 * ------------------------------------------------------------------
 * OpenAI REST API를 axios로 직접 호출한다. (별도 SDK 의존성 없음)
 *  - 임베딩: POST /v1/embeddings
 *  - 채팅  : POST /v1/chat/completions
 */
import axios from 'axios';
import type {ChatMessage, ChatOptions, ChatProvider, EmbeddingProvider, EmbeddingPurpose, ToolExecutor, ToolFunctionSpec} from '../types.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

/** 함수호출 루프 무한방지 상한 (도구 호출 → 결과 반영 → 재호출 최대 횟수) */
const MAX_TOOL_STEPS = 5;

/** OpenAI tool_calls 의 arguments 는 JSON 문자열 → 안전 파싱 (깨졌으면 빈 객체) */
function parseArgs(raw: any): Record<string, any> {
    if (raw && typeof raw === 'object') return raw;
    try {
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    public readonly name = 'openai';
    public readonly dimensions: number;
    private readonly apiKey: string;
    private readonly model: string;

    constructor(apiKey: string, model = 'text-embedding-3-small') {
        this.apiKey = apiKey;
        this.model = model;
        // text-embedding-3-large = 3072, small/ada = 1536
        this.dimensions = model === 'text-embedding-3-large' ? 3072 : 1536;
    }

    // OpenAI 임베딩엔 query/document 구분이 없어서 purpose는 무시한다
    async embed(text: string, _purpose?: EmbeddingPurpose): Promise<number[]> {
        const [vec] = await this.embedBatch([text]);
        return vec;
    }

    async embedBatch(texts: string[], _purpose?: EmbeddingPurpose): Promise<number[][]> {
        const res = await axios.post(
            `${OPENAI_BASE}/embeddings`,
            {model: this.model, input: texts},
            {
                headers: {Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json'},
                timeout: 30000
            }
        );
        // OpenAI는 입력 순서를 index로 돌려주므로 정렬 후 벡터만 추출
        return res.data.data
            .sort((a: any, b: any) => a.index - b.index)
            .map((d: any) => d.embedding as number[]);
    }
}

export class OpenAIChatProvider implements ChatProvider {
    public readonly name = 'openai';
    private readonly apiKey: string;
    private readonly model: string;

    constructor(apiKey: string, model = 'gpt-4o-mini') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
        const res = await axios.post(
            `${OPENAI_BASE}/chat/completions`,
            {
                model: options.model || this.model,
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 1024
            },
            {
                headers: {Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json'},
                timeout: 60000
            }
        );
        return res.data.choices?.[0]?.message?.content ?? '';
    }

    /**
     * 함수호출(tool calling) 루프. (OpenAI chat/completions 의 tool_calls / role:'tool' 규격)
     * 모델이 도구를 부르면 execute()로 실행 → 결과를 role:'tool' 메시지로 되돌리고 다시 호출, content가 나올 때까지 반복.
     */
    async chatWithTools(systemText: string, userText: string, tools: ToolFunctionSpec[], execute: ToolExecutor, options: ChatOptions = {}): Promise<string> {
        const url = `${OPENAI_BASE}/chat/completions`;
        const config = {headers: {Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json'}, timeout: 60000};
        const model = options.model || this.model;
        const toolSpecs = tools.map((t) => ({type: 'function', function: {name: t.name, description: t.description, parameters: t.parameters}}));

        // 대화 누적 (assistant tool_calls / tool 결과 메시지가 쌓임)
        const messages: any[] = [
            {role: 'system', content: systemText},
            {role: 'user', content: userText}
        ];

        for (let step = 0; step < MAX_TOOL_STEPS; step++) {
            const res = await axios.post(url, {model, messages, temperature: options.temperature ?? 0.2, max_tokens: options.maxTokens ?? 1024, tools: toolSpecs}, config);
            const message = res.data.choices?.[0]?.message;
            const calls: any[] = message?.tool_calls ?? [];

            // 도구 호출이 없으면 = 최종 답변
            if (calls.length === 0) {
                return message?.content ?? '';
            }

            // 모델의 함수호출 턴을 대화에 기록 (원본 message 그대로)
            messages.push(message);

            // 각 호출 실행 → tool_call_id 로 매칭되는 role:'tool' 메시지로 결과 전달
            for (const call of calls) {
                let result: any;
                try {
                    result = await execute(call.function?.name, parseArgs(call.function?.arguments));
                } catch (e: any) {
                    result = {error: e?.message || String(e)};
                }
                messages.push({role: 'tool', tool_call_id: call.id, content: JSON.stringify(result)});
            }
        }

        // 상한 도달 → 도구 없이 마지막으로 한 번 더 물어서 텍스트 답변을 강제
        const finalRes = await axios.post(url, {model, messages, temperature: options.temperature ?? 0.2, max_tokens: options.maxTokens ?? 1024}, config);
        return finalRes.data.choices?.[0]?.message?.content ?? '';
    }
}
