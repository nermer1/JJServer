import logger from '../utils/logger.js';
import {DepartmentSyncService} from '../service/sync/DepartmentSyncService.js';
import {UserSyncService} from '../service/sync/UserSyncService.js';
import {withJobLogging} from '../utils/JobLogger.js';

/**
 * 인사 정보 동기화 배치 작업 (Orchestration)
 * 부서 정보를 먼저 동기화한 후, 유저 정보를 동기화합니다.
 */
export const syncHrDataJob = async (options?: {trigger?: string; userId?: string}) => {
    const trigger = options?.trigger || 'scheduler';
    const userId = options?.userId || 'SYSTEM';

    // 1. 부서 동기화 (선행 필수) - 단독 로깅
    const deptSync = new DepartmentSyncService();
    const runDeptSync = withJobLogging(deptSync.sync.bind(deptSync), {
        category: 'SYNC',
        action: '부서 데이터 동기화',
        target: 'departments',
        actionType: 'EXECUTE'
    });
    await runDeptSync({trigger, userId});

    // 2. 유저 동기화 - 단독 로깅
    const userSync = new UserSyncService();
    const runUserSync = withJobLogging(userSync.sync.bind(userSync), {
        category: 'SYNC',
        action: '인사(유저) 데이터 동기화',
        target: 'users',
        actionType: 'EXECUTE'
    });
    await runUserSync({active_only: true, trigger, userId});

    // 전체를 감싸는 합산 로그는 찍지 않음 (세부 로그로 2줄 나뉘어 찍힘)
    return { skipLog: true };
};

