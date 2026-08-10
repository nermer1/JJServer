/**
 * OpenAI Provider 구현체
 * ------------------------------------------------------------------
 * OpenAI REST API를 axios로 직접 호출한다. (별도 SDK 의존성 없음)
 *  - 임베딩: POST /v1/embeddings
 *  - 채팅  : POST /v1/chat/completions
 */
import axios from 'axios';
import type {ChatMessage, ChatOptions, ChatProvider, EmbeddingProvider, EmbeddingPurpose} from '../types.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

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
}
