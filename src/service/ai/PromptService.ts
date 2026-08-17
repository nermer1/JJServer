/**
 * PromptService - Langfuse(self-host) Prompt Management 연동 (SDK 사용)
 * ------------------------------------------------------------------
 * 프롬프트를 코드에 하드코딩하지 않고, 사내 self-host 랭퓨즈에서 이름으로 가져온다.
 * → 랭퓨즈 UI에서 프롬프트/설정(config)만 고치면 재배포 없이 반영됨.
 *
 * 반환값 { text, config, promptObj }:
 *   - text     : 프롬프트 본문 (시스템 프롬프트)
 *   - config   : 프롬프트에 딸린 임의 JSON (model/temperature/tools 등)
 *   - promptObj: 랭퓨즈 프롬프트 객체 (트레이스 generation 연동용 — 어느 프롬프트 버전이 답을 냈는지 추적)
 *
 * SDK가 캐싱(cacheTtlSeconds) + stale-while-revalidate + fallback 을 내장 처리한다.
 * (기존의 hand-rolled TTL 캐시는 SDK로 대체 → 삭제)
 *
 * 설정값(SystemSettings(DB) → env):
 *   - LANGFUSE_HOST / LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY (클라이언트)
 *   - LANGFUSE_PROMPT_LABEL     (기본 production)
 *   - LANGFUSE_PROMPT_CACHE_TTL (기본 60초)
 */
import SystemSettingsCacheService from '../SystemSettingsCacheService.js';
import logger from '../../utils/logger.js';
import {AppSettings} from '../../constants/appSettings.js';
import {getLangfuseClient} from './langfuseClient.js';

/** {{variable}} 형태를 vars 값으로 치환. 값이 없는 변수는 그대로 둔다. */
function compile(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key in vars ? vars[key] : `{{${key}}}`));
}

export interface LangfusePrompt {
    text: string;
    config: Record<string, any>;
    /** 랭퓨즈 프롬프트 객체 (트레이스 연동용). 미설정/폴백 시 undefined. */
    promptObj?: any;
}

class PromptService {
    /**
     * 프롬프트 + config 를 가져온다. 랭퓨즈 미설정/실패 시 하드코딩 fallback.
     * @param name           랭퓨즈 프롬프트 이름 (예: 'rag-system-prompt')
     * @param fallbackText   랭퓨즈 불가 시 쓸 하드코딩 프롬프트
     * @param fallbackConfig 랭퓨즈 불가 시 쓸 config
     */
    public static async getPrompt(name: string, fallbackText: string, fallbackConfig: Record<string, any> = {}): Promise<LangfusePrompt> {
        const client = getLangfuseClient();
        if (!client) {
            return {text: fallbackText, config: fallbackConfig};
        }

        const label = SystemSettingsCacheService.resolve(AppSettings.LANGFUSE_PROMPT_LABEL) || 'production';
        const ttlRaw = Number(SystemSettingsCacheService.resolve(AppSettings.LANGFUSE_PROMPT_CACHE_TTL));
        const cacheTtlSeconds = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 60;

        try {
            // SDK: 캐시 유효하면 네트워크 없이 반환, 만료면 재조회(+실패 시 stale/fallback)
            const prompt = await client.getPrompt(name, undefined, {label, cacheTtlSeconds, type: 'text', fallback: fallbackText});

            const raw: any = (prompt as any).prompt;
            const text =
                typeof raw === 'string'
                    ? raw
                    : Array.isArray(raw)
                      ? raw
                            .map((m: any) => m?.content ?? '')
                            .filter(Boolean)
                            .join('\n')
                      : fallbackText;
            const config = ((prompt as any).config ?? {}) as Record<string, any>;

            return {text, config, promptObj: prompt};
        } catch (e: any) {
            logger.warn(`[PromptService] 랭퓨즈 프롬프트 로드 실패(${name}): ${e?.message || e} → fallback 사용`);
            return {text: fallbackText, config: fallbackConfig};
        }
    }

    /** 텍스트만 필요할 때의 편의 메서드 ({{var}} 치환 포함). */
    public static async getText(name: string, fallbackText: string, variables: Record<string, string> = {}): Promise<string> {
        const {text} = await this.getPrompt(name, fallbackText);
        return compile(text, variables);
    }
}

export default PromptService;
