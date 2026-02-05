import logger from './logger.js';

interface LogMeta {
    [key: string]: any;
}

interface AuditMeta extends LogMeta {
    userId: string;
    action: string;
}

export class Log {
    static info(message: string, meta: LogMeta = {}) {
        logger.info(message, meta);
    }

    static audit(message: string, meta: AuditMeta) {
        logger.info(message, {
            isAudit: true,
            meta
        });
    }

    static error(message: string, error?: any) {
        if (error instanceof Error) {
            logger.error(message, {
                err: {message: error.message, stack: error.stack},
                saveToDb: true
            });
        } else {
            logger.error(message, {err: error, saveToDb: true});
        }
    }
}
