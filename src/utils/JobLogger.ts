import {DBLogger} from './DBLogger.js';

export interface JobLogOptions {
    category: 'SLACK' | 'SYNC' | 'USER' | 'SYSTEM' | 'OTHER' | 'DATA' | 'FILE';
    action: string;
    target?: string;
    actionType?: string;
    userId?: string;
}

/**
 * 공통 로깅 래퍼 (HOF - Higher Order Function)
 * 스케줄러나 수동 호출(컨트롤러) 양쪽에서 동일한 방식의 DB 로그를 남기도록 보장합니다.
 */
export const withJobLogging = (jobFunction: (...args: any[]) => any, logOptions: JobLogOptions) => {
    return async (...args: any[]) => {
        // 첫 번째 인자(보통 options 객체)에서 userId 추출 시도
        const argUserId = args[0] && typeof args[0] === 'object' ? args[0].userId : null;
        const fallbackUserId = argUserId || logOptions.userId || 'SYSTEM';

        try {
            // 1. 핵심 비즈니스 로직 실행
            const result = await jobFunction(...args);

            // 로직 내부에서 반환한 userId가 있으면 우선 적용
            const finalUserId = (result && typeof result === 'object' && result.userId) ? result.userId : fallbackUserId;

            // 2. 스킵 조건이 아니라면 성공 로그 기록
            if (result?.skipLog !== true) {
                await DBLogger.log({
                    ...logOptions,
                    userId: finalUserId,
                    details: result,
                    status: 'SUCCESS'
                });
            }
            return result;
        } catch (error: any) {
            // 3. 에러 발생 시 실패 로그 기록
            await DBLogger.log({
                ...logOptions,
                userId: fallbackUserId,
                details: { error: error.message, stack: error.stack },
                status: 'FAIL'
            });
            throw error; // 에러를 상위로 다시 던짐
        }
    };
};
