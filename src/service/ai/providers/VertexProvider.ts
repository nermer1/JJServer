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
import type {ChatMessage, ChatOptions, ChatProvider, EmbeddingProvider, EmbeddingPurpose, ToolExecutor, ToolFunctionSpec} from '../types.js';

/** 함수호출 루프 무한방지 상한 (도구 호출 → 결과 반영 → 재호출 최대 횟수) */
const MAX_TOOL_STEPS = 5;

/**
 * 엔드포인트 베이스 URL 생성.
 * ⚠️ project/location 을 모듈 로드 시점의 env로 고정하지 않고 생성자 주입값으로 만든다.
 *    (LLMFactory 가 DB(SystemSettings)에서 읽은 값을 넘겨줄 수 있게 하기 위함)
 */
function buildBase(projectId: string, location: string): string {
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models`;
}

// google-auth-library가 토큰을 캐시·자동 갱신해줌 (1시간 유효)
// 인증(GOOGLE_APPLICATION_CREDENTIALS/ADC)만 env로 두고, 프로젝트·리전은 생성자로 주입받음.
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
    private readonly base: string;

    constructor(model = 'gemini-2.5-flash', projectId = process.env.VERTEX_PROJECT_ID || '', location = process.env.VERTEX_LOCATION || 'us-central1') {
        this.model = model;
        this.base = buildBase(projectId, location);
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
            `${this.base}/${model}:generateContent`,
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

    /**
     * 함수호출(function calling) 루프.
     * 모델이 도구를 부르면 execute()로 실행 → 결과를 대화에 넣고 다시 호출, 텍스트가 나올 때까지 반복.
     * (Vertex/Gemini generateContent 의 functionCall / functionResponse 규격)
     */
    async chatWithTools(systemText: string, userText: string, tools: ToolFunctionSpec[], execute: ToolExecutor, options: ChatOptions = {}): Promise<string> {
        const token = await getAccessToken();
        const model = options.model || this.model;
        const url = `${this.base}/${model}:generateContent`;
        const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'};
        const generationConfig = {temperature: options.temperature ?? 0.2, maxOutputTokens: options.maxTokens ?? 1024};
        const toolConfig = {tools: [{functionDeclarations: tools}]};

        // 대화 누적 (functionCall/functionResponse 가 쌓임)
        const contents: any[] = [{role: 'user', parts: [{text: userText}]}];

        for (let step = 0; step < MAX_TOOL_STEPS; step++) {
            const res = await axios.post(
                url,
                {systemInstruction: {parts: [{text: systemText}]}, contents, generationConfig, ...toolConfig},
                {headers, timeout: 60000}
            );
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
        const finalRes = await axios.post(url, {systemInstruction: {parts: [{text: systemText}]}, contents, generationConfig}, {headers, timeout: 60000});
        return (finalRes.data.candidates?.[0]?.content?.parts ?? [])
            .map((p: any) => p.text ?? '')
            .join('')
            .trim();
    }
}

export class VertexEmbeddingProvider implements EmbeddingProvider {
    public readonly name = 'vertex';
    public readonly dimensions: number;
    private readonly model: string;
    private readonly base: string;

    // 한국어면 text-multilingual-embedding-002(768) 권장. gemini-embedding-001은 최대 3072.
    constructor(
        model = 'text-multilingual-embedding-002',
        dimensions = 768,
        projectId = process.env.VERTEX_PROJECT_ID || '',
        location = process.env.VERTEX_LOCATION || 'us-central1'
    ) {
        this.model = model;
        this.dimensions = dimensions;
        this.base = buildBase(projectId, location);
    }

    async embed(text: string, purpose: EmbeddingPurpose = 'query'): Promise<number[]> {
        const [vec] = await this.embedBatch([text], purpose);
        return vec;
    }

    async embedBatch(texts: string[], purpose: EmbeddingPurpose = 'query'): Promise<number[][]> {
        const token = await getAccessToken();
        const taskType = purpose === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY';

        const res = await axios.post(
            `${this.base}/${this.model}:predict`,
            {
                instances: texts.map((t) => ({task_type: taskType, content: t})),
                parameters: {outputDimensionality: this.dimensions}
            },
            {headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, timeout: 30000}
        );
        return res.data.predictions.map((p: any) => p.embeddings.values as number[]);
    }
}

