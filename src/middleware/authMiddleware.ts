import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {externalProperty} from '../properties/ServerProperty.js';
import logger from '../utils/logger.js';
import {ApiKeys} from '../schemas/apiKeys.js';

// 제외할 라우트 목록 (인증 없이 접근 가능)
// /auth 라우터로 묶여있어 req.path가 /auth/login 또는 /auth/refresh로 들어옵니다.
const EXCLUDE_ROUTES = ['/auth/login', '/auth/refresh', '/docs'];

export const verifyApiToken = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // 0. 예외 라우트 검사
    if (EXCLUDE_ROUTES.some((route) => path.startsWith(route))) {
        return next();
    }

    // 1. 헤더에서 토큰 추출 (x-api-key 또는 Authorization: Bearer <token>)
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;
    let token = '';

    if (apiKeyHeader) {
        token = apiKeyHeader;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        return res.status(401).json({
            success: false,
            message: '인증 토큰이 누락되었거나 형식이 올바르지 않습니다.'
        });
    }

    // 2. 외부 연동용 DB 다중 API Key 비교 (Option A)
    try {
        const dbKey = await ApiKeys.model.findOne({key: token, isActive: true});
        if (dbKey) {
            // 사용 기록 업데이트
            await ApiKeys.model.updateOne({key: token}, {lastUsedAt: new Date()});
            // API Key가 일치하면 통과
            return next();
        }
    } catch (error) {
        logger.error(`API Key DB 조회 중 에러: ${error}`);
    }

    // 3. JWT 검증 (Option B)
    // 현재 LoginController.test에서 사용하는 시크릿 키는 'test'로 하드코딩 되어 있습니다.
    // 추후 환경변수로 분리하는 것이 좋습니다.
    const jwtSecret = externalProperty.getString('JWT_SECRET', 'test');

    try {
        const decoded = jwt.verify(token, jwtSecret);
        // 복호화된 사용자 정보(userId, isAdmin 등)를 req 객체에 담습니다.
        (req as any).user = decoded;
        return next();
    } catch (error) {
        logger.error(`토큰 검증 실패: ${error}`);
        return res.status(401).json({
            success: false,
            message: '유효기간이 만료되었거나 유효하지 않은 토큰입니다. (인증 실패)'
        });
    }
};

