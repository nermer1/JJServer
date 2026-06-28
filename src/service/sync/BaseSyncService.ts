import {Model} from 'mongoose';
import {apiClient} from '../../modules/httpClient/ApiClient.js';
import logger from '../../utils/logger.js';
import {DBLogger} from '../../utils/DBLogger.js';

export abstract class BaseSyncService<ExternalDataType> {
    protected abstract apiUrl: string;
    protected abstract model: Model<any>;
    protected abstract serviceName: string;

    /**
     * 외부 API를 호출하여 데이터를 가져옵니다.
     */
    protected async fetchExternalData(params?: Record<string, any>): Promise<ExternalDataType[]> {
        const response = await apiClient.get<any>(this.apiUrl, {params});

        if (!response.success) {
            logger.error(`[${this.serviceName}] API 호출 실패: ${response.error}`, response.details);
            return [];
        }

        let data = response.data;

        // 데이터가 배열이 아닌 객체(예: { list: [...] } 등)로 래핑되어 올 경우 배열을 찾아 추출
        if (data && !Array.isArray(data) && typeof data === 'object') {
            for (const key of Object.keys(data)) {
                if (Array.isArray(data[key])) {
                    data = data[key];
                    break;
                }
            }
        }

        return Array.isArray(data) ? data : [];
    }

    /**
     * 외부 데이터를 Mongoose Bulk 연산 배열로 변환합니다.
     * (상속받은 클래스에서 각자의 매핑 룰에 맞게 구현)
     */
    protected abstract buildBulkOps(externalData: ExternalDataType[]): Promise<any[]>;

    /**
     * 동기화 배치 메인 로직 (템플릿 메서드)
     */
    public async sync(params?: Record<string, any>): Promise<void> {
        try {
            logger.info(`[${this.serviceName}] 동기화 시작...`);

            // 1. 데이터 패치
            const data = await this.fetchExternalData(params);
            if (!data || data.length === 0) {
                logger.warn(`[${this.serviceName}] 받아온 동기화 데이터가 없습니다.`);
                return;
            }

            // 2. 가공 및 매핑
            const bulkOps = await this.buildBulkOps(data);
            if (bulkOps.length === 0) {
                logger.info(`[${this.serviceName}] 처리할 Bulk 연산이 없습니다.`);
                return;
            }

            // 3. DB 일괄 저장 (BulkWrite)
            const result = await this.model.bulkWrite(bulkOps as any);

            const trigger = params?.trigger || 'manual';
            const userId = params?.userId || 'SYSTEM';

            await DBLogger.log({
                category: 'SYNC',
                action: `${this.serviceName} 동기화 완료 (${trigger})`,
                userId,
                details: {
                    trigger,
                    upsertedCount: result.upsertedCount,
                    modifiedCount: result.modifiedCount,
                    deletedCount: result.deletedCount,
                    ...params
                },
                status: 'SUCCESS'
            });
        } catch (error: any) {
            const trigger = params?.trigger || 'manual';
            const userId = params?.userId || 'SYSTEM';

            // 실패 기록을 DB에 남김 (status: 'FAIL')
            await DBLogger.log({
                category: 'SYNC',
                action: `${this.serviceName} 동기화 실패 (${trigger})`,
                userId,
                details: {trigger, error: error?.message || String(error), ...params},
                status: 'FAIL'
            });

            // ⚠️ 여기서 에러를 다시 던져서(Throw), 호출한 쪽(라우터나 스케줄러)이 실패 사실을 알게 해야 합니다.
            throw error;
        }
    }
}

