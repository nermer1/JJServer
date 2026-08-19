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
import {AppSettings} from '../../constants/appSettings.js';

export type LLMType = 'openai' | 'gemini' | 'vertex';

export class LLMFactory {
    /** 답변 생성용 provider 생성 */
    static createChat(): ChatProvider {
        const provider = SystemSettingsCacheService.resolve(AppSettings.CHAT_PROVIDER);
        let apiKey = '',
            chatModel = '';
        switch (provider) {
            case 'openai':
                apiKey = SystemSettingsCacheService.resolve(AppSettings.OPENAI_API_KEY);
                chatModel = SystemSettingsCacheService.resolve(AppSettings.OPENAI_CHAT_MODEL);
                return new OpenAIChatProvider(apiKey, chatModel);
            case 'gemini':
                apiKey = SystemSettingsCacheService.resolve(AppSettings.GEMINI_API_KEY);
                chatModel = SystemSettingsCacheService.resolve(AppSettings.GEMINI_CHAT_MODEL);
                return new GeminiChatProvider(apiKey, chatModel);
            case 'vertex':
                // Vertex 인증(OAuth)만 GOOGLE_APPLICATION_CREDENTIALS(env)로 두고,
                // 나머지 설정값(모델·프로젝트·리전)은 DB(SystemSettings) → env fallback 으로 조회.
                chatModel = SystemSettingsCacheService.resolve(AppSettings.VERTEX_CHAT_MODEL);
                const projectId = SystemSettingsCacheService.resolve(AppSettings.VERTEX_PROJECT_ID);
                // 챗 전용 리전 override(예: global) → 없으면 공통 VERTEX_LOCATION 사용.
                // 신형 모델(gemini-3.x 등)은 us-central1 미지원이라 global 엔드포인트가 필요한 경우가 있어 분리한다.
                // (임베딩은 계속 VERTEX_LOCATION을 써서 기존 벡터와 리전/모델을 유지)
                const location =
                    SystemSettingsCacheService.resolve(AppSettings.VERTEX_CHAT_LOCATION) ||
                    SystemSettingsCacheService.resolve(AppSettings.VERTEX_LOCATION);
                return new VertexChatProvider(chatModel, projectId, location);
            default:
                throw new Error(`[LLMFactory] 지원하지 않는 chat provider: ${provider}`);
        }
    }

    /** 임베딩(검색)용 provider 생성 */
    static createEmbedding(): EmbeddingProvider {
        const provider = SystemSettingsCacheService.resolve(AppSettings.EMBEDDING_PROVIDER);
        let apiKey = '',
            embeddingModel = '';
        switch (provider) {
            case 'openai':
                apiKey = SystemSettingsCacheService.resolve(AppSettings.OPENAI_API_KEY);
                embeddingModel = SystemSettingsCacheService.resolve(AppSettings.OPENAI_EMBEDDING_MODEL);
                return new OpenAIEmbeddingProvider(apiKey, embeddingModel);
            case 'gemini':
                apiKey = SystemSettingsCacheService.resolve(AppSettings.GEMINI_API_KEY);
                embeddingModel = SystemSettingsCacheService.resolve(AppSettings.GEMINI_EMBEDDING_MODEL);
                return new GeminiEmbeddingProvider(apiKey, embeddingModel);
            case 'vertex':
                // Vertex 인증(OAuth)만 GOOGLE_APPLICATION_CREDENTIALS(env)로 두고, 나머지는 DB → env fallback.
                const embedDim = Number(SystemSettingsCacheService.resolve(AppSettings.RAG_EMBED_DIM));
                const projectId = SystemSettingsCacheService.resolve(AppSettings.VERTEX_PROJECT_ID);
                const location = SystemSettingsCacheService.resolve(AppSettings.VERTEX_LOCATION);
                embeddingModel = SystemSettingsCacheService.resolve(AppSettings.VERTEX_EMBED_MODEL);
                return new VertexEmbeddingProvider(embeddingModel, embedDim, projectId, location);
            default:
                throw new Error(`[LLMFactory] 지원하지 않는 embedding provider: ${provider}`);
        }
    }
}

export default LLMFactory;

