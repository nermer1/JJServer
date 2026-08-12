/**
 * Gemini(Google) Provider 구현체
 * ------------------------------------------------------------------
 * Google Generative Language REST API를 axios로 호출한다.
 * OpenAI와 요청/응답 형식이 달라서 여기서 변환을 흡수한다.
 * → 덕분에 상위 코드(ChatService)는 OpenAI든 Gemini든 동일하게 사용 가능.
 */
import axios from 'axios';
import type {ChatMessage, ChatOptions, ChatProvider, EmbeddingProvider, EmbeddingPurpose, ToolExecutor, ToolFunctionSpec} from '../types.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** 함수호출 루프 무한방지 상한 (도구 호출 → 결과 반영 → 재호출 최대 횟수) */
const MAX_TOOL_STEPS = 5;

/**
 * 일시적 오류(429 쿼터/속도, 503 과부하)에 짧은 지수 백오프로 재시도한다.
 * 인터랙티브 요청이라 오래 안 기다리게 최대 3회(약 0.5s→1s→2s)만 재시도.
 */
async function postWithRetry(url: string, body: any, config: any, attempt = 0): Promise<any> {
    const MAX_RETRIES = 3;
    try {
        return await axios.post(url, body, config);
    } catch (e: any) {
        const status = e?.response?.status;
        if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
            const waitMs = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            return postWithRetry(url, body, config, attempt + 1);
        }
        throw e;
    }
}

export class GeminiChatProvider implements ChatProvider {
    public readonly name = 'gemini';
    private readonly apiKey: string;
    private readonly model: string;

    constructor(apiKey: string, model = 'gemini-3.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
        // system 메시지는 systemInstruction으로, 나머지는 contents로 변환
        const systemText = messages
            .filter((m) => m.role === 'system')
            .map((m) => m.content)
            .join('\n');

        const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{text: m.content}]
            }));

        const model = options.model || this.model;
        const res = await postWithRetry(
            `${GEMINI_BASE}/models/${model}:generateContent?key=${this.apiKey}`,
            {
                ...(systemText ? {systemInstruction: {parts: [{text: systemText}]}} : {}),
                contents,
                generationConfig: {
                    temperature: options.temperature ?? 0.2,
                    maxOutputTokens: options.maxTokens ?? 1024
                }
            },
            {headers: {'Content-Type': 'application/json'}, timeout: 60000}
        );
        return res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    /**
     * 함수호출(function calling) 루프. (Vertex 구현과 동일한 규격 — generateContent 의 functionCall/functionResponse)
     * 모델이 도구를 부르면 execute()로 실행 → 결과를 대화에 넣고 다시 호출, 텍스트가 나올 때까지 반복.
     * generativelanguage API 는 API 키 인증 + postWithRetry(429/503 백오프)를 그대로 사용.
     */
    async chatWithTools(systemText: string, userText: string, tools: ToolFunctionSpec[], execute: ToolExecutor, options: ChatOptions = {}): Promise<string> {
        const model = options.model || this.model;
        const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${this.apiKey}`;
        const config = {headers: {'Content-Type': 'application/json'}, timeout: 60000};
        const generationConfig = {temperature: options.temperature ?? 0.2, maxOutputTokens: options.maxTokens ?? 1024};
        const toolConfig = {tools: [{functionDeclarations: tools}]};
        const systemInstruction = {parts: [{text: systemText}]};

        // 대화 누적 (functionCall/functionResponse 가 쌓임)
        const contents: any[] = [{role: 'user', parts: [{text: userText}]}];

        for (let step = 0; step < MAX_TOOL_STEPS; step++) {
            const res = await postWithRetry(url, {systemInstruction, contents, generationConfig, ...toolConfig}, config);
            const parts: any[] = res.data.candidates?.[0]?.content?.parts ?? [];
            const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

            // 도구 호출이 없으면 = 최종 답변
            if (calls.length === 0) {
                return parts
                    .map((p) => p.text ?? '')
                    .join('')
                    .trim();
            }

            // 모델의 함수호출 턴을 대화에 기록
            contents.push({role: 'model', parts: calls.map((fc: any) => ({functionCall: fc}))});

            // 각 호출 실행 → functionResponse 로 되돌려줌 (response 는 반드시 객체여야 함)
            const responseParts = [];
            for (const fc of calls) {
                let result: any;
                try {
                    result = await execute(fc.name, fc.args ?? {});
                } catch (e: any) {
                    result = {error: e?.message || String(e)};
                }
                responseParts.push({functionResponse: {name: fc.name, response: {result}}});
            }
            contents.push({role: 'user', parts: responseParts});
        }

        // 상한 도달 → 도구 없이 마지막으로 한 번 더 물어서 텍스트 답변을 강제
        const finalRes = await postWithRetry(url, {systemInstruction, contents, generationConfig}, config);
        return (finalRes.data.candidates?.[0]?.content?.parts ?? [])
            .map((p: any) => p.text ?? '')
            .join('')
            .trim();
    }
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
    public readonly name = 'gemini';
    public readonly dimensions: number;
    private readonly apiKey: string;
    private readonly model: string;

    constructor(apiKey: string, model = 'gemini-embedding-2', dimensions = 768) {
        this.apiKey = apiKey;
        this.model = model;
        // 주의: 이 dimensions 값(outputDimensionality)이 Atlas 인덱스 numDimensions와 반드시 일치해야 함
        this.dimensions = dimensions;
    }

    async embed(text: string, purpose: EmbeddingPurpose = 'query'): Promise<number[]> {
        const taskType = purpose === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY';
        const res = await postWithRetry(
            `${GEMINI_BASE}/models/${this.model}:embedContent?key=${this.apiKey}`,
            {
                model: `models/${this.model}`,
                content: {parts: [{text}]},
                taskType,
                outputDimensionality: this.dimensions
            },
            {headers: {'Content-Type': 'application/json'}, timeout: 30000}
        );
        return (res.data.embedding?.values as number[]) ?? [];
    }

    async embedBatch(texts: string[], purpose: EmbeddingPurpose = 'query'): Promise<number[][]> {
        // Gemini 단건 embedContent를 순차 호출 (배치 필요 시 batchEmbedContents로 교체 가능)
        return Promise.all(texts.map((t) => this.embed(t, purpose)));
    }
}

