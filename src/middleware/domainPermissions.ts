import {Request, Response, NextFunction} from 'express';
import logger from '../utils/logger.js';
import ApiReturn from '../structure/ApiReturn.js';

type PermissionRule = {
    public?: boolean;
    any?: string[];
    dept?: string;
    deptField?: string;
    own?: string;
    ownField?: string;
};

// 각 핵심 도메인별 권한 규칙
const RULES: Record<string, Record<string, PermissionRule>> = {
    users: {
        C: {any: ['user:create:any']},
        R: {any: ['user:read:any'], dept: 'user:read:dept', deptField: 'department_id', own: 'user:read:own'},
        U: {any: ['user:update:any'], dept: 'user:update:dept', deptField: 'department_id', own: 'user:update:own'},
        D: {any: ['user:delete:any'], dept: 'user:delete:dept', deptField: 'department_id'}
    },
    role: {
        C: {any: ['role:create:any']},
        R: {public: true},
        U: {any: ['role:update:any']},
        D: {any: ['role:delete:any']}
    },
    permission: {
        C: {any: ['permission:create:any']},
        R: {any: ['permission:read:any']},
        U: {any: ['permission:update:any']},
        D: {any: ['permission:delete:any']}
    },
    apiKeys: {
        C: {own: 'apikey:create:own'},
        R: {any: ['apikey:read:any'], own: 'apikey:read:own', ownField: 'userId'},
        U: {own: 'apikey:update:own', ownField: 'userId'},
        D: {any: ['apikey:delete:any'], own: 'apikey:delete:own', ownField: 'userId'}
    },
    systemSettings: {
        C: {any: ['system:admin']},
        R: {any: ['system:admin']},
        U: {any: ['system:admin']},
        D: {any: ['system:admin']}
    }
};

/**
 * 도메인 전용 미들웨어 팩토리 함수
 * 기존 genericCrudPermission의 로직을 그대로 사용하되, 타겟 컬렉션의 룰만 독립적으로 검사합니다.
 */
const createDomainPermission = (collectionName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const params = req.body;
        const user = (req as any).user;
        const apiReturn = new ApiReturn();

        const collectionRules = RULES[collectionName];
        if (!collectionRules) {
            apiReturn.setReturnErrorMessage('서버 설정 에러: 도메인 룰이 없습니다.');
            return res.status(403).json(apiReturn);
        }

        const rule = collectionRules[params.type];
        if (!rule) {
            logger.warn(`[Security] 허용되지 않은 액션(${params.type}) 시도: ${collectionName}`);
            apiReturn.setReturnErrorMessage('해당 도메인에 대해 허용되지 않은 작업입니다.');
            return res.status(403).json(apiReturn);
        }

        if (rule.public) return next();

        if (!user || !user.permissions || !Array.isArray(user.permissions)) {
            logger.warn(`[DomainPermission] 인증되지 않은 접근 시도 (${collectionName})`);
            apiReturn.setReturnErrorMessage('인증 정보가 없습니다.');
            return res.status(401).json(apiReturn);
        }

        let hasAnyPermission = false;
        if (rule.any && rule.any.length > 0) {
            hasAnyPermission = rule.any.some((p) => user.permissions.includes(p));
        }

        if (hasAnyPermission) return next();

        if (user.type === 'apikey') {
            const identifier = user.key || 'Unknown';
            logger.warn(`[Permission Denied] API Key 접근 거부 (Key: ${identifier}, Req: ${collectionName}[${params.type}])`);
            apiReturn.setReturnErrorMessage('API Key에 해당 데이터 접근 권한이 없습니다.');
            return res.status(403).json(apiReturn);
        }

        if (rule.dept && user.permissions.includes(rule.dept)) {
            if (!user.department_id) {
                apiReturn.setReturnErrorMessage('소속 부서 정보가 없어 접근할 수 없습니다.');
                return res.status(403).json(apiReturn);
            }
            if (!params.option) params.option = {};
            const fieldName = rule.deptField || 'department_id';
            params.option[fieldName] = user.department_id;
            return next();
        }

        if (rule.own && user.permissions.includes(rule.own)) {
            if (!params.option) params.option = {};
            const fieldName = rule.ownField || 'email';
            params.option[fieldName] = user.userId;
            return next();
        }

        logger.warn(`[Permission Denied] 접근 권한 없음 (User: ${user.userId || 'Unknown'}, Req: ${collectionName}[${params.type}])`);
        apiReturn.setReturnErrorMessage('해당 기능을 사용할 권한이 없습니다.');
        return res.status(403).json(apiReturn);
    };
};

export const userCrudPermission = createDomainPermission('users');
export const roleCrudPermission = createDomainPermission('role');
export const permissionCrudPermission = createDomainPermission('permission');
export const apiKeyCrudPermission = createDomainPermission('apiKeys');
export const systemSettingsCrudPermission = createDomainPermission('systemSettings');

