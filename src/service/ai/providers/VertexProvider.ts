/**
 * Vertex AI Provider 구현체
 * ------------------------------------------------------------------
 * Gemini Developer API(providers/GeminiProvider.ts)와 다른 점:
 *  - 인증: API 키 ❌ → Google Cloud OAuth2 액세스 토큰 (google-auth-library, ADC/서비스계정)
 *  - 엔드포인트: {LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/...
 *  - 임베딩: :predict (instances / parameters) 방식
 *
 * 사전 준비:
 *  1) GCP 프로젝트에서 "Vertex AI API" 활성화
 *  2) 인증(둘 중 하나):
 *     - 서비스계정 키(JSON) 발급 → 환경변수 GOOGLE_APPLICATION_CREDENTIALS 에 그 파일 경로 지정, 또는
 *     - 서버에서 `gcloud auth application-default login`
 *  3) 환경변수: VERTEX_PROJECT_ID, VERTEX_LOCATION(예: us-central1)
 *  4) 패키지 설치: npm install google-auth-library
 */
import axios from 'axios';
import {GoogleAuth} from 'google-auth-library';
import type {ChatMessage, ChatOptions, ChatProvider, EmbeddingProvider, EmbeddingPurpose} from '../types.js';

const PROJECT = process.env.VERTEX_PROJECT_ID || '';
const LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models`;

// google-auth-library가 토큰을 캐시·자동 갱신해줌 (1시간 유효)
const auth = new GoogleAuth({scopes: 'https://www.googleapis.com/auth/cloud-platform'});

async function getAccessToken(): Promise<string> {
    const client = await auth.getClient();
    const res = await client.getAccessToken();
    if (!res || !res.token) {
        throw new Error('[Vertex] 액세스 토큰 발급 실패 — ADC/서비스계정 설정(GOOGLE_APPLICATION_CREDENTIALS)을 확인하세요.');
    }
    return res.token;
}

export class VertexChatProvider implements ChatProvider {
    public readonly name = 'vertex';
    private readonly model: string;

    constructor(model = 'gemini-2.5-flash') {
        this.model = model;
    }

    async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
        const token = await getAccessToken();

        // system 메시지 분리 (Gemini 형식과 동일)
        const systemText = messages
            .filter((m) => m.role === 'system')
            .map((m) => m.content)
            .join('\n');
        const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({role: m.role === 'assistant' ? 'model' : 'user', parts: [{text: m.content}]}));

        const model = options.model || this.model;
        const res = await axios.post(
            `${BASE}/${model}:generateContent`,
            {
                ...(systemText ? {systemInstruction: {parts: [{text: systemText}]}} : {}),
                contents,
                generationConfig: {
                    temperature: options.temperature ?? 0.2,
                    maxOutputTokens: options.maxTokens ?? 1024
                }
            },
            {headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, timeout: 60000}
        );
        return res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
}

export class VertexEmbeddingProvider implements EmbeddingProvider {
    public readonly name = 'vertex';
    public readonly dimensions: number;
    private readonly model: string;

    // 한국어면 text-multilingual-embedding-002(768) 권장. gemini-embedding-001은 최대 3072.
    constructor(model = 'text-multilingual-embedding-002', dimensions = 768) {
        this.model = model;
        this.dimensions = dimensions;
    }

    async embed(text: string, purpose: EmbeddingPurpose = 'query'): Promise<number[]> {
        const [vec] = await this.embedBatch([text], purpose);
        return vec;
    }

    async embedBatch(texts: string[], purpose: EmbeddingPurpose = 'query'): Promise<number[][]> {
        const token = await getAccessToken();
        const taskType = purpose === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY';

        const res = await axios.post(
            `${BASE}/${this.model}:predict`,
            {
                instances: texts.map((t) => ({task_type: taskType, content: t})),
                parameters: {outputDimensionality: this.dimensions}
            },
            {headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, timeout: 30000}
        );
        return res.data.predictions.map((p: any) => p.embeddings.values as number[]);
    }
}

