import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import {ApiKeys} from '../schemas/apiKeys.js';
import PermissionCacheService from '../service/PermissionCacheService.js';
import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import redisTest from '../db/RedisTest.js';

// 제외할 라우트 목록 (인증 없이 접근 가능)
// /auth 라우터로 묶여있어 req.path가 /auth/login 또는 /auth/refresh로 들어옵니다.
const AUTH_CONFIG = {
    // 인증 검사를 아예 생략하는 라우트 (토큰 파싱 X)
    exclude: ['/auth/slack', '/auth/login', '/auth/refresh', '/docs', '/apikeys', '/integrations/slack/commands', '/integrations/slack/interactivity'],
    // 선택적 인증 라우트 (토큰이 없어도 통과, 있으면 파싱해서 req.user에 담아줌)
    optional: ['/interviewQuiz', '/interviewQuizSubmit']
};

export const verifyApiToken = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // 0. 예외 라우트 검사
    if (AUTH_CONFIG.exclude.some((route) => path.startsWith(route))) {
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
        if (AUTH_CONFIG.optional.some((route) => path.startsWith(route))) {
            return next(); // 토큰 없이 비로그인 상태로 통과
        }
        const err = new Error('인증 토큰이 누락되었거나 형식이 올바르지 않습니다.');
        (err as any).status = 401;
        return next(err);
    }

    // 2. 외부 연동용 API Key 캐시(또는 DB) 비교 (Option A)
    // JWT를 API Key로 오해하고 캐시/DB를 찌르지 않도록, 'ak_'로 시작하거나 x-api-key 헤더가 있을 때만 검사합니다.
    if (token.startsWith('ak_') || apiKeyHeader) {
        try {
            const cachedKey = await PermissionCacheService.getCachedApiKey(token);
            if (cachedKey) {
                // 사용 기록 업데이트 (비동기 처리로 응답 속도 저하 방지)
                ApiKeys.model
                    .updateOne({key: token}, {lastUsedAt: new Date()})
                    .exec()
                    .catch((err) => {
                        logger.error(`API Key lastUsedAt 업데이트 중 에러: ${err}`);
                    });

                (req as any).user = {
                    key: token,
                    userId: cachedKey.userId,
                    type: 'apikey',
                    permissions: cachedKey.permissions
                };

                // API Key가 일치하면 통과
                return next();
            }
        } catch (error) {
            logger.error(`API Key 검증 중 에러: ${error}`);
        }
    }

    // 3. JWT 검증 (Option B)
    // DB의 SystemSettings에서 캐싱된 동적 시크릿 키를 우선 가져옵니다.
    const jwtSecret = SystemSettingsCacheService.getRequired('JWT_SECRET');

    try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        decoded.type = 'jwt';

        // 3-1. 전역 강제 로그아웃 (Global Logout) 검증
        // JWT의 발급 시간(iat)이 서버의 전역 로그아웃 시점보다 옛날이면 만료 처리
        const globalLogoutTimeStr = await redisTest.get('global_logout_time');
        if (globalLogoutTimeStr && decoded.iat) {
            const globalLogoutTime = parseInt(globalLogoutTimeStr, 10);
            if (decoded.iat < globalLogoutTime) {
                const err = new Error('보안을 위해 전역 로그아웃 처리되었습니다. 다시 로그인해주세요.');
                (err as any).status = 401;
                (err as any).code = 'GLOBAL_LOGOUT';
                return next(err);
            }
        }

        // JWT Payload 대신 Redis에서 권한과 최신 레벨 가져오기 (캐시 없으면 DB 조회 후 자동 캐싱)
        if (decoded.userId) {
            const cachedData = await PermissionCacheService.getCachedPermissions(decoded.userId);
            decoded.permissions = cachedData.permissions;
            // 토큰에 박힌 구형 level을 무시하고 Redis에서 가져온 최신 level로 무조건 덮어쓰기
            if (cachedData.level !== undefined) {
                decoded.level = cachedData.level;
            }
        } else {
            decoded.permissions = [];
        }

        // 복호화된 사용자 정보(userId, permissions 등)를 req 객체에 담습니다.
        (req as any).user = decoded;
        return next();
    } catch (error: any) {
        /* const err = new Error('유효기간이 만료되었거나 유효하지 않은 토큰입니다. (인증 실패)');
        (err as any).status = 401;
        return next(err); */
        logger.warn(`JWT 검증 에러: ${error.name} - ${error.message}`);
        if (error.name === 'TokenExpiredError') {
            const err = new Error('토큰 유효기간이 만료되었습니다. 다시 로그인해주세요.');
            (err as any).status = 401;
            (err as any).code = 'EXPIRED_TOKEN'; // 클라이언트가 이 코드를 보고 토큰 갱신을 시도하게 함
            return next(err);
        } else {
            const err = new Error('유효하지 않은 토큰입니다. (인증 실패)');
            (err as any).status = 401;
            return next(err);
        }
    }
};
