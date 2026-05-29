import {Request, Response, NextFunction} from 'express';
import logger from '../utils/logger.js';

/**
 * 특정 권한이 있는지 검사하는 인가(Authorization) 미들웨어
 * 
 * @param requiredPermission 필요한 권한 (예: 'user:create:any')
 */
export const requirePermission = (requiredPermission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        // 1. 유저 정보나 권한 배열이 아예 없는 경우 (인증 실패 또는 토큰/키 오류)
        if (!user || !user.permissions || !Array.isArray(user.permissions)) {
            logger.warn(`[Permission Denied] 접근 거부: 사용자에게 부여된 권한 정보가 없습니다. (Required: ${requiredPermission})`);
            return res.status(403).json({
                ok: false, 
                message: '권한 검증에 실패했습니다. (부여된 권한 정보가 없습니다)'
            });
        }

        // 2. 요구되는 권한이 있는지 확인
        if (!user.permissions.includes(requiredPermission)) {
            const identifier = user.userId || user.key || 'Unknown';
            logger.warn(`[Permission Denied] 사용자(${identifier})가 권한 없이 접근 시도. (Required: ${requiredPermission}, Has: ${user.permissions.join(', ')})`);
            return res.status(403).json({
                ok: false, 
                message: '해당 기능을 사용할 권한이 없습니다.'
            });
        }

        // 3. 권한이 일치하면 다음 로직으로 패스
        next();
    };
};
