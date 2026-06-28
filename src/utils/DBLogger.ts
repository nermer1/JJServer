import logger from './logger.js';
import {AuditLog} from '../schemas/auditLog.js';

interface AuditLogTemplate {
    category: 'SLACK' | 'SYNC' | 'USER' | 'SYSTEM' | 'OTHER' | 'DATA';
    action: string;
    target?: string;
    actionType?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'LOGIN' | 'LOGOUT' | string;
    userId?: string;
    details?: any;
    status?: 'SUCCESS' | 'FAIL' | 'PENDING';
}

export class DBLogger {
    /**
     * DB(AuditLog)와 파일(logger.info)에 동시에 로그를 남깁니다.
     * @param logData DB에 저장될 템플릿 규격 데이터
     */
    public static async log(logData: AuditLogTemplate): Promise<void> {
        const {category, action, target = 'N/A', actionType = 'EXECUTE', userId = 'SYSTEM', details = {}, status = 'SUCCESS'} = logData;

        // 1. 파일 로그 기록 (콘솔 및 app-YYYY-MM-DD.log)
        // 향후 디버깅을 위해 문자열 포맷으로 직관적으로 출력
        logger.info(`[${category}] [${actionType}] ${action} (Target: ${target}, User: ${userId}, Status: ${status})`, { meta: details });

        try {
            await AuditLog.model.create({
                category,
                action,
                target,
                actionType,
                userId,
                details,
                status
            });
        } catch (error) {
            logger.error(`[DBLogger Error] AuditLog 저장 실패: ${error}`);
        }
    }

    /**
     * [편의 메서드] Slack 관련 전용 로거
     */
    public static async slack(action: string, details?: any, userId?: string, status: 'SUCCESS' | 'FAIL' | 'PENDING' = 'SUCCESS'): Promise<void> {
        const uid = userId || (details && details.user_id) || 'SYSTEM';
        return this.log({ category: 'SLACK', action, details, userId: uid, status });
    }
}
