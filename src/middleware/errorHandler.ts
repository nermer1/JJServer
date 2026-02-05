import {Request, Response, NextFunction} from 'express';
import logger from '../utils/logger.js';

interface HttpException extends Error {
    status?: number;
    message: string;
    formatResponse?: () => {status: number; body: any};
}

interface AuthenticatedRequest extends Request {
    user?: {
        _id: string;
        name: string;
        email: string;
    };
}

const isAppError = (err: unknown): err is AppError => {
    return err instanceof Error && typeof (err as AppError).formatResponse === 'function';
};

const SENSITIVE_KEYS = ['password', 'authKey', 'verificationCode', 'token', 'refreshToken', 'phoneNumber', 'cardNumber'];

const errorHandler = (err: HttpException, req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    let status = 500;
    let responseBody: any = {
        success: false,
        message: '서버 내부 오류가 발생했습니다.'
    };
    let stack = '';

    const safeBody = {...req.body};
    SENSITIVE_KEYS.forEach((key) => {
        if (key in safeBody) {
            safeBody[key] = '****';
        }
    });

    if (isAppError(err)) {
        const formatted = err.formatResponse();
        status = formatted.status;
        responseBody = formatted.body;
        stack = err.stack ?? '';
    } else if (err instanceof Error) {
        status = err.status ?? 500;
        responseBody.message = err.message;
        stack = err.stack ?? '';
    }

    const errorMeta = {
        req: {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            query: req.query,
            body: safeBody,
            headers: req.headers
        },
        user: user != null ? {id: user._id, name: user.name} : 'Guest',
        stack
    };

    logger.error(`[${status}] ${JSON.stringify(responseBody)}`, {meta: errorMeta});

    if (res.headersSent) {
        return;
    }

    res.status(status).json(responseBody);
};

export default errorHandler;
