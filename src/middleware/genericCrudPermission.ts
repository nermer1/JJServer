import {Request, Response, NextFunction} from 'express';
import logger from '../utils/logger.js';

/**
 * PrdApiController (만능 라우터) 전용 동적 권한 검사 및 쿼리 조작 미들웨어
 * - req.params.collection 과 req.body.type 을 분석하여 동적으로 권한을 제어합니다.
 * - :own 권한인 경우 남의 데이터를 건드리지 못하게 req.body.option 조건을 강제 조작합니다 (ABAC).
 */
export const genericCrudPermission = (req: Request, res: Response, next: NextFunction) => {
    const collectionName = req.params.collection;
    const params = req.body;
    const user = (req as any).user; // authMiddleware에서 넘어온 유저 정보 (userId, permissions)

    // 0. 인증 정보 확인 (방어 로직)
    if (!user || !user.permissions || !Array.isArray(user.permissions)) {
        logger.warn(`[GenericPermission] 인증되지 않은 접근 시도 (${collectionName})`);
        return res.status(401).json({ok: false, message: '인증 정보가 없습니다.'});
    }

    // ==========================================
    // ⭐ API Key (외부 시스템) 전용 로직 분리
    // ==========================================
    if (user.type === 'apikey') {
        // 기계(API Key)는 사람처럼 'own' 검사(이메일 강제 주입)를 하지 않고 전용 권한을 검사합니다.
        if (collectionName === 'users' && params.type === 'R') {
            // api:read:users 권한이 있거나, 기존 관리자 권한이 있으면 통과
            if (user.permissions.includes('api:read:users') || user.permissions.includes('user:read:any')) {
                return next(); 
            } else {
                logger.warn(`[Permission Denied] API Key 접근 거부 (Key: ${user.key})`);
                return res.status(403).json({ok: false, message: 'API Key에 해당 데이터 접근 권한이 없습니다.'});
            }
        }
        
        // 추후 다른 컬렉션 기계 전용 로직 추가 부분
        logger.warn(`[Permission Denied] 허용되지 않은 API Key 컬렉션 접근 (${collectionName})`);
        return res.status(403).json({ok: false, message: '허용되지 않은 API Key 접근입니다.'});
    }

    // ==========================================
    // 👤 JWT (일반 유저) 권한 처리
    // ==========================================
    if (collectionName === 'users') {
        
        // --- 조회 (R) ---
        if (params.type === 'R') {
            if (user.permissions.includes('user:read:any')) {
                // 관리자: 제약 없이 그대로 통과
                return next();
            } else if (user.permissions.includes('user:read:own')) {
                // 일반 유저: 본인 데이터만 조회하도록 쿼리 조작
                if (!params.option) params.option = {};
                params.option.email = user.userId;
                return next();
            } else {
                logger.warn(`[Permission Denied] 유저 조회 권한 없음 (User: ${user.userId})`);
                return res.status(403).json({ok: false, message: '유저 조회 권한이 없습니다.'});
            }
        }
        
        // --- 수정 (U) ---
        // (예시) 회원정보 수정 로직
        // if (params.type === 'U') {
        //     if (user.permissions.includes('user:update:any')) {
        //         return next();
        //     } else if (user.permissions.includes('user:update:own')) {
        //         // 수정 조건 강제 고정
        //         if (!params.option) params.option = {};
        //         params.option.email = user.userId; 
        //         return next();
        //     } else {
        //         return res.status(403).json({ok: false, message: '유저 수정 권한이 없습니다.'});
        //     }
        // }
    }

    // ==========================================
    // 2. 다른 컬렉션들에 대한 기본 통과 처리
    // ==========================================
    // 주의: 현재는 권한 설정이 완료되지 않은 다른 컬렉션들을 임시로 통과시킵니다.
    // 추후 모든 컬렉션에 대한 case가 작성되면, 맨 마지막에는 무조건 403 에러를 뱉도록 수정해야 가장 안전합니다!
    // logger.warn(`[GenericPermission] 권한 체크 로직이 정의되지 않은 컬렉션 접근 허용: ${collectionName}`);
    next();
};
