/**
 * langfuseClient.ts — Langfuse SDK 클라이언트 (단일 공유 인스턴스)
 * ------------------------------------------------------------------
 * 프롬프트 조회(PromptService)와 트레이싱(LangfuseTracer)이 같은 클라이언트를 재사용한다.
 *
 * ⚠️ "호출 시점"에 지연 생성한다 — 모듈 로드 시점엔 loadSettings() 전이라 LANGFUSE_* 키가 비어있음.
 *    키가 준비되면 1회 생성해 캐시하고, 없으면 null(비활성) 반환 후 다음 호출 때 재시도.
 */
import {Langfuse} from 'langfuse';
import SystemSettingsCacheService from '../SystemSettingsCacheService.js';
import {AppSettings} from '../../constants/appSettings.js';

let client: Langfuse | null = null;

export function getLangfuseClient(): Langfuse | null {
    if (client) return client;

    const host = SystemSettingsCacheService.resolve(AppSettings.LANGFUSE_HOST);
    const publicKey = SystemSettingsCacheService.resolve(AppSettings.LANGFUSE_PUBLIC_KEY);
    const secretKey = SystemSettingsCacheService.resolve(AppSettings.LANGFUSE_SECRET_KEY);
    if (!host || !publicKey || !secretKey) return null; // 미설정 → 비활성

    client = new Langfuse({publicKey, secretKey, baseUrl: host});
    return client;
}
