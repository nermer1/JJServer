/**
 * PromptService - Langfuse(self-host) Prompt Management 연동
 * ------------------------------------------------------------------
 * 프롬프트를 코드에 하드코딩하지 않고, 사내 self-host 랭퓨즈에서 이름으로 가져온다.
 * → 랭퓨즈 UI에서 프롬프트/설정(config)만 고치면 재배포 없이 반영됨.
 *
 * 반환값은 { text, config } 두 가지:
 *   - text   : 프롬프트 본문 (시스템 프롬프트)
 *   - config : 프롬프트에 딸린 임의 JSON (model/temperature/tools/fieldMap 등)
 *
 * 설계(SystemSettingsCacheService 와 동일 철학의 hand-rolled 캐시):
 *   - TTL 캐시(Map): 유효하면 네트워크 요청 없이 즉시 반환
 *   - stale-while-error: 랭퓨즈 호출 실패 시, 만료된 캐시라도 있으면 그걸 사용
 *   - 최종 fallback: 캐시도 없으면 호출부가 넘긴 하드코딩 값 사용 → 랭퓨즈 죽어도 서비스 정상
 *
 * 설정값(SystemSettings(DB) → env 순):
 *   - LANGFUSE_HOST / LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY
 *   - LANGFUSE_PROMPT_LABEL     (기본 production)
 *   - LANGFUSE_PROMPT_CACHE_TTL (기본 60초)
 */
import axios from 'axios';
import SystemSettingsCacheService from '../SystemSettingsCacheService.js';
import logger from '../../utils/logger.js';

/** SystemSettings(DB) 우선 → env → 기본값 */
function getSetting(key: string, fallback = ''): string {
    const fromCache = SystemSettingsCacheService.get(key);
    if (fromCache && fromCache.trim() !== '') return fromCache;

    const fromEnv = process.env[key];
    if (fromEnv && fromEnv.trim() !== '') return fromEnv;

    return fallback;
}

/** {{variable}} 형태를 vars 값으로 치환. 값이 없는 변수는 그대로 둔다. */
function compile(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key in vars ? vars[key] : `{{${key}}}`));
}

export interface LangfusePrompt {
    text: string;
    config: Record<string, any>;
}

interface CacheEntry extends LangfusePrompt {
    fetchedAt: number;
}

class PromptService {
    private static cache = new Map<string, CacheEntry>();

    /**
     * 프롬프트 + config 를 가져온다. 실패 시 stale 캐시 → fallback 순으로 폴백.
     * @param name           랭퓨즈 프롬프트 이름 (예: 'rag-system-prompt')
     * @param fallbackText   랭퓨즈/캐시 모두 불가할 때 쓸 하드코딩 프롬프트
     * @param fallbackConfig 랭퓨즈/캐시 모두 불가할 때 쓸 config
     */
    public static async getPrompt(name: string, fallbackText: string, fallbackConfig: Record<string, any> = {}): Promise<LangfusePrompt> {
        const ttlMs = Number(getSetting('LANGFUSE_PROMPT_CACHE_TTL', '60')) * 1000;
        const label = getSetting('LANGFUSE_PROMPT_LABEL', 'production');
        const cacheKey = `${name}@${label}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        // 1) 캐시가 유효하면 즉시 반환 (네트워크 X)
        if (cached && now - cached.fetchedAt < ttlMs) {
            return {text: cached.text, config: cached.config};
        }

        // 2) 만료 or 최초 → 새로 시도
        try {
            const fetched = await this.fetchFromLangfuse(name, label);
            this.cache.set(cacheKey, {...fetched, fetchedAt: now});
            return fetched;
        } catch (e: any) {
            // 3) 실패 시 폴백: 오래된 캐시라도 있으면 사용, 없으면 하드코딩 fallback
            logger.warn(`[PromptService] 랭퓨즈 프롬프트 로드 실패(${name}): ${e?.message || e} → ${cached ? 'stale 캐시 사용' : 'fallback 사용'}`);
            if (cached) return {text: cached.text, config: cached.config};
            return {text: fallbackText, config: fallbackConfig};
        }
    }

    /**
     * 텍스트만 필요할 때의 편의 메서드 ({{var}} 치환 포함).
     */
    public static async getText(name: string, fallbackText: string, variables: Record<string, string> = {}): Promise<string> {
        const {text} = await this.getPrompt(name, fallbackText);
        return compile(text, variables);
    }

    /** self-host 랭퓨즈 public API 호출: GET /api/public/v2/prompts/{name}?label=... (Basic auth) */
    private static async fetchFromLangfuse(name: string, label: string): Promise<LangfusePrompt> {
        const host = getSetting('LANGFUSE_HOST');
        const publicKey = getSetting('LANGFUSE_PUBLIC_KEY');
        const secretKey = getSetting('LANGFUSE_SECRET_KEY');
        if (!host || !publicKey || !secretKey) {
            throw new Error('LANGFUSE_HOST / LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY 미설정');
        }

        const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
        const url = `${host.replace(/\/+$/, '')}/api/public/v2/prompts/${encodeURIComponent(name)}`;
        const res = await axios.get(url, {
            params: {label},
            headers: {Authorization: `Basic ${auth}`, 'Content-Type': 'application/json'},
            timeout: 5000
        });

        const prompt = res.data?.prompt;
        const config = (res.data?.config ?? {}) as Record<string, any>;

        // text 타입이면 문자열
        if (typeof prompt === 'string') return {text: prompt, config};
        // 혹시 chat 타입(배열)이 넘어오면 각 메시지 content 를 이어붙여 안전하게 처리
        if (Array.isArray(prompt)) {
            return {
                text: prompt
                    .map((m: any) => m?.content ?? '')
                    .filter(Boolean)
                    .join('\n'),
                config
            };
        }
        throw new Error('예상치 못한 프롬프트 응답 형식');
    }
}

export default PromptService;

