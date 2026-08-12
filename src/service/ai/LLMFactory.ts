/**
 * LLMFactory - LLM Provider 팩토리
 * ------------------------------------------------------------------
 * 기존 DBFactory 와 동일한 패턴. 설정값(type)에 따라 알맞은 구현체를 돌려준다.
 * 상위 코드는 이 팩토리만 알면 되고, 어떤 회사 API인지는 몰라도 된다.
 *
 * 설정 우선순위: SystemSettings(운영, DB) → 환경변수(.env, 개발) fallback
 *   - 회사 정책상 비밀키를 어드민 시스템 설정으로 관리하면 SystemSettings에,
 *     로컬 개발용으로 빠르게 테스트하려면 config/server 의 .env 에 넣으면 됨.
 */
import SystemSettingsCacheService from '../SystemSettingsCacheService.js';
import type {ChatProvider, EmbeddingProvider} from './types.js';
import {OpenAIChatProvider, OpenAIEmbeddingProvider} from './providers/OpenAIProvider.js';
import {GeminiChatProvider, GeminiEmbeddingProvider} from './providers/GeminiProvider.js';
import {VertexChatProvider, VertexEmbeddingProvider} from './providers/VertexProvider.js';

export type LLMType = 'openai' | 'gemini' | 'vertex';

/** SystemSettings 우선, 없으면 환경변수에서 조회. 둘 다 없으면 예외 (필수값용) */
function getSetting(key: string): string {
    const fromCache = SystemSettingsCacheService.get(key);
    if (fromCache && fromCache.trim() !== '') return fromCache;

    const fromEnv = process.env[key];
    if (fromEnv && fromEnv.trim() !== '') return fromEnv;

    throw new Error(`[LLMFactory] 설정값 "${key}" 가 없습니다. (SystemSettings 또는 config/server .env 에 등록 필요)`);
}

/** getSetting 과 동일하나, 없으면 예외 대신 기본값 반환 (모델명·리전 등 기본값이 있는 값용) */
function getSettingOr(key: string, fallback: string): string {
    const fromCache = SystemSettingsCacheService.get(key);
    if (fromCache && fromCache.trim() !== '') return fromCache;

    const fromEnv = process.env[key];
    if (fromEnv && fromEnv.trim() !== '') return fromEnv;

    return fallback;
}

export class LLMFactory {
    /** 답변 생성용 provider 생성 */
    static createChat(type?: LLMType): ChatProvider {
        const provider = type || (getSettingOr('CHAT_PROVIDER', 'gemini') as LLMType);
        switch (provider) {
            case 'openai':
                return new OpenAIChatProvider(getSetting('OPENAI_API_KEY'), getSettingOr('OPENAI_CHAT_MODEL', 'gpt-4o-mini'));
            case 'gemini':
                return new GeminiChatProvider(getSetting('GEMINI_API_KEY'), getSettingOr('GEMINI_CHAT_MODEL', 'gemini-3.5-flash'));
            case 'vertex':
                // Vertex 인증(OAuth)만 GOOGLE_APPLICATION_CREDENTIALS(env)로 두고,
                // 나머지 설정값(모델·프로젝트·리전)은 DB(SystemSettings) → env fallback 으로 조회.
                return new VertexChatProvider(
                    getSettingOr('VERTEX_CHAT_MODEL', 'gemini-2.5-flash'),
                    getSetting('VERTEX_PROJECT_ID'),
                    getSettingOr('VERTEX_LOCATION', 'us-central1')
                );
            default:
                throw new Error(`[LLMFactory] 지원하지 않는 chat provider: ${provider}`);
        }
    }

    /** 임베딩(검색)용 provider 생성 */
    static createEmbedding(type?: LLMType): EmbeddingProvider {
        const provider = type || (getSettingOr('EMBEDDING_PROVIDER', 'gemini') as LLMType);
        switch (provider) {
            case 'openai':
                return new OpenAIEmbeddingProvider(getSetting('OPENAI_API_KEY'), getSettingOr('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'));
            case 'gemini':
                return new GeminiEmbeddingProvider(getSetting('GEMINI_API_KEY'), getSettingOr('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-2'));
            case 'vertex':
                // Vertex 인증(OAuth)만 GOOGLE_APPLICATION_CREDENTIALS(env)로 두고, 나머지는 DB → env fallback.
                return new VertexEmbeddingProvider(
                    getSettingOr('VERTEX_EMBED_MODEL', 'text-multilingual-embedding-002'),
                    Number(getSettingOr('RAG_EMBED_DIM', '768')),
                    getSetting('VERTEX_PROJECT_ID'),
                    getSettingOr('VERTEX_LOCATION', 'us-central1')
                );
            default:
                throw new Error(`[LLMFactory] 지원하지 않는 embedding provider: ${provider}`);
        }
    }
}

export default LLMFactory;

