import logger from '../utils/logger.js';
import UniPostCipher from '../cipher/UniPostCipher.js';

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
                    try {
                        // 서버 캐시에는 평문으로 복호화해서 올려둠 (빠른 토큰 검증 등을 위해)
                        const decryptedValue = UniPostCipher.getInstance().decrypt(setting.value);
                        this.cache.set(setting.key, decryptedValue);
                    } catch (e) {
                        // 만약 기존 평문 데이터라 복호화에 실패하면 평문 그대로 캐싱
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
     * @param key 설정 키 (예: 'JWT_SECRET')
     * @param defaultValue 캐시에 없을 경우 반환할 기본값
     */
    public static get(key: string, defaultValue?: string): string {
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        return defaultValue || '';
    }
}

export default SystemSettingsCacheService;

