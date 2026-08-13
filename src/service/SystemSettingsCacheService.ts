import logger from '../utils/logger.js';
import {AppSettingsSchema, SettingKey, AppSettingMeta} from '../constants/appSettings.js';

class SystemSettingsCacheService {
    private static cache = new Map<string, string>();

    /**
     * DB에서 모든 설정을 가져와 메모리에 로드합니다.
     * 서버 구동 시 한 번 호출되거나, 값이 변경될 때마다 호출됩니다.
     */
    public static async loadSettings(): Promise<void> {
        try {
            // 순환 참조 방지를 위해 동적 임포트
            const {SystemSettings} = await import('../schemas/systemSettings.js');
            // DB 원천 데이터는 암호화되어 있음
            const settings = await SystemSettings.model.find({}).lean();

            this.cache.clear();
            settings.forEach((setting: any) => {
                if (setting.key && setting.value !== undefined) {
                    if (setting.is_encrypted) {
                        try {
                            // 서버 캐시에는 평문으로 복호화해서 올려둠
                            const decryptedValue = SystemSettings.uniPostCipher.decrypt(setting.value);
                            this.cache.set(setting.key, decryptedValue);
                        } catch (e) {
                            this.cache.set(setting.key, setting.value);
                        }
                    } else {
                        // 평문은 그대로 캐싱
                        this.cache.set(setting.key, setting.value);
                    }
                }
            });
            logger.info(`[SystemSettings] ${settings.length}개의 설정이 메모리에 로드되었습니다.`);
        } catch (error) {
            logger.error(`[SystemSettings] 설정 로드 중 에러: ${error}`);
        }
    }

    /**
     * 메모리에 캐시된 설정값을 가져옵니다. DB 접근 없이 즉시 반환됩니다.
     * @param key 설정 키 (예: 'SMTP_PORT')
     * @param defaultValue 캐시에 없을 경우 반환할 기본값
     */
    public static get(key: string, defaultValue?: string): string {
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        return defaultValue || '';
    }

    /**
     * 설정 "키"를 받아 값을 조회. DB(캐시) → 환경변수 → 스키마의 기본값 순.
     * 흩어져 있던 "getSetting(DB→env→fallback)" 로직의 단일 진입점(앱 표준 접근자).
     * 저수준 get()을 재료로 쓰고, 기본값은 AppSettingsSchema[key] 에서 내부적으로 참조한다.
     * @param key 설정 키 — 예: AppSettings.CHAT_HISTORY_TURNS ('CHAT_HISTORY_TURNS')
     */
    public static resolve(key: SettingKey): string {
        const fromCache = this.get(key);
        if (fromCache && fromCache.trim() !== '') return fromCache;

        const fromEnv = process.env[key];
        if (fromEnv && fromEnv.trim() !== '') return fromEnv;

        return (AppSettingsSchema[key] as AppSettingMeta).default ?? '';
    }

    /**
     * 부팅 시 1회 호출: AppSettings 의 required:true 항목이 DB(캐시)/env 어디에도 없으면 예외를 던진다(fail-fast).
     * → 필수 설정 누락 시 서버가 아예 기동되지 않게 한다. (선택 설정은 검사 안 함 → 없어도 정상 기동)
     */
    public static validateRequired(): void {
        const missing = (Object.keys(AppSettingsSchema) as SettingKey[]).filter((key) => {
            if (!(AppSettingsSchema[key] as AppSettingMeta).required) return false;
            const cached = this.get(key);
            if (cached && cached.trim() !== '') return false;
            const env = process.env[key];
            if (env && env.trim() !== '') return false;
            return true; // DB/env 둘 다 없음 → 누락
        });

        if (missing.length) {
            throw new Error(`[CRITICAL] 필수 시스템 설정 누락: ${missing.join(', ')} — 어드민 설정 또는 env 에 등록 필요.`);
        }
        logger.info('[SystemSettings] 필수 설정 검증 통과.');
    }

    /**
     * 필수 시스템 설정값을 가져옵니다. 값이 없으면 치명적 에러를 발생시킵니다. (Fail-Fast)
     * @param key 설정 키 (예: 'JWT_SECRET')
     */
    public static getRequired(key: string): string {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            if (value && value.trim() !== '') return value;
        }
        throw new Error(`[CRITICAL] 필수 시스템 설정값(${key})이 존재하지 않습니다. 어드민 시스템 설정에서 키를 등록해주세요.`);
    }
}

export default SystemSettingsCacheService;
