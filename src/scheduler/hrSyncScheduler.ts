import logger from '../utils/logger.js';
import {DepartmentSyncService} from '../service/sync/DepartmentSyncService.js';
import {UserSyncService} from '../service/sync/UserSyncService.js';
import {DBLogger} from '../utils/DBLogger.js';

/**
 * 인사 정보 동기화 배치 작업 (Orchestration)
 * 부서 정보를 먼저 동기화한 후, 유저 정보를 동기화합니다.
 */
export const syncHrDataJob = async (options?: {trigger?: string; userId?: string}) => {
    const trigger = options?.trigger || 'scheduler';
    const userId = options?.userId || 'SYSTEM';

    try {
        // 1. 부서 동기화 (선행 필수)
        const deptSync = new DepartmentSyncService();
        await deptSync.sync({trigger, userId});

        // 2. 유저 동기화 (부서 ObjectId 매핑 포함)
        // 활성 사용자만 가져오도록 쿼리 파라미터 전달
        const userSync = new UserSyncService();
        await userSync.sync({active_only: true, trigger, userId});
    } catch (error: any) {
        logger.error('[배치 오류] 동기화 파이프라인 처리 중 치명적 에러 발생:', error);
    }
};

