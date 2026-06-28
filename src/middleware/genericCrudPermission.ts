import {Request, Response, NextFunction} from 'express';
import logger from '../utils/logger.js';

type PermissionRule = {
    public?: boolean; // 이 값이 true면 인증/권한 없이 누구나 접근 가능 (비로그인 허용)
    any?: string[]; // 이 중 하나라도 있으면 조건 없이 통과 (관리자, API Key 등)
    dept?: string; // 이 권한이 있으면 부서 데이터만 볼 수 있도록 쿼리 조작
    deptField?: string; // 부서 조작 시 사용할 DB 필드명 (기본값: 'department_id')
    own?: string; // 이 권한이 있으면 본인 데이터만 볼 수 있도록 쿼리 조작
    ownField?: string; // 쿼리 조작 시 사용할 DB 필드명 (기본값: 'email')
};

// 권한 규칙 설정 (컬렉션명 -> 행위(R,U,C,D) -> 권한 규칙)
const PERMISSION_RULES: Record<string, Record<string, PermissionRule>> = {
    users: {
        C: {
            any: ['user:create:any']
        },
        R: {
            any: ['user:read:any'],
            dept: 'user:read:dept',
            deptField: 'department_id',
            own: 'user:read:own'
        },
        U: {
            any: ['user:update:any'],
            dept: 'user:update:dept',
            deptField: 'department_id',
            own: 'user:update:own'
        },
        D: {
            any: ['user:delete:any'],
            dept: 'user:delete:dept',
            deptField: 'department_id'
        }
    },
    apiKeys: {
        C: {
            own: 'apikey:create:own'
        },
        R: {
            any: ['apikey:read:any'],
            own: 'apikey:read:own',
            ownField: 'userId'
        },
        U: {
            own: 'apikey:update:own',
            ownField: 'userId'
        },
        D: {
            any: ['apikey:delete:any'],
            own: 'apikey:delete:own',
            ownField: 'userId'
        }
    },
    interviewQuiz: {
        C: {},
        R: {
            public: true, // 누구나 문제 조회 가능 (면접자용)
            any: ['assessment:read:any']
        },
        U: {},
        D: {}
    },
    interviewQuizSubmit: {
        C: {
            public: true, // 누구나 문제 제출 가능 (면접자용)
            any: ['assessment:submit:any']
        },
        R: {
            any: ['assessment_submission:read:any'],
            own: 'assessment_submission:read:own'
        },
        U: {},
        D: {}
    },
    customerList: {
        C: {
            any: ['customer:create:any'],
            dept: 'customer:create:dept',
            deptField: 'department_ids'
        },
        R: {
            any: ['customer:read:any']
        },
        U: {
            any: ['customer:update:any'],
            dept: 'customer:update:dept',
            deptField: 'department_ids'
        },
        D: {
            any: ['customer:delete:any'],
            dept: 'customer:delete:dept',
            deptField: 'department_ids'
        }
    },
    role: {
        C: {
            any: ['role:create:any']
        },
        R: {
            public: true
        },
        U: {
            any: ['role:update:any']
        },
        D: {
            any: ['role:delete:any']
        }
    },
    permission: {
        C: {
            any: ['permission:create:any']
        },
        R: {
            any: ['permission:read:any']
        },
        U: {
            any: ['permission:update:any']
        },
        D: {
            any: ['permission:delete:any']
        }
    },
    department: {
        C: {
            any: ['department:create:any']
        },
        R: {
            any: ['department:read:any']
        },
        U: {
            any: ['department:update:any']
        },
        D: {
            any: ['department:delete:any']
        }
    },
    menus: {
        R: {
            any: ['menus:read:any']
        },
        U: {
            any: ['menus:update:any']
        }
    },
    systemSettings: {
        C: {
            any: ['system:admin']
        },
        R: {
            any: ['system:admin']
        },
        U: {
            any: ['system:admin']
        },
        D: {
            any: ['system:admin']
        }
    },
    auditLog: {
        R: {
            // 오직 최고 관리자만 관리자 대시보드 화면 등에서 로그 조회 가능
            any: ['system:admin']
        }
        // C, U, D 속성을 아예 비워둠으로써 API를 통한 로그 위조/삭제 원천 차단
    }
};

/**
 * PrdApiController (만능 라우터) 전용 동적 권한 검사 및 쿼리 조작 미들웨어
 * - req.params.collection 과 req.body.type 을 분석하여 동적으로 권한을 제어합니다.
 * - 설정 주도 패턴(Config-Driven)을 적용하여 PERMISSION_RULES 객체를 해석합니다.
 */
export const genericCrudPermission = (req: Request, res: Response, next: NextFunction) => {
    const collectionName = req.params.collection;
    const params = req.body;
    const user = (req as any).user; // authMiddleware에서 넘어온 유저 정보 (userId, permissions)

    // 1. 해당 컬렉션과 요청 타입(R, U, C, D)에 매핑된 규칙 찾기
    const collectionRules = PERMISSION_RULES[collectionName];
    if (!collectionRules) {
        logger.warn(`[Security] 화이트리스트에 없는 컬렉션 접근 시도: ${collectionName}`);
        return res.status(403).json({ok: false, message: '허용되지 않은 API 접근입니다.'});
    }

    const rule = collectionRules[params.type];
    if (!rule) {
        logger.warn(`[Security] 허용되지 않은 액션(${params.type}) 시도: ${collectionName}`);
        return res.status(403).json({ok: false, message: '해당 컬렉션에 대해 허용되지 않은 작업입니다.'});
    }

    // 1.5. 'public' 권한 검사 (비로그인 사용자 무사 통과)
    if (rule.public) {
        return next();
    }

    // 2. 인증 정보 확인 (방어 로직) - public이 아닐 때만 확인
    if (!user || !user.permissions || !Array.isArray(user.permissions)) {
        logger.warn(`[GenericPermission] 인증되지 않은 접근 시도 (${collectionName})`);
        return res.status(401).json({ok: false, message: '인증 정보가 없습니다.'});
    }

    // 2. 'any' 권한 검사 (API Key / 최고관리자 등 프리패스 검사)
    let hasAnyPermission = false;
    if (rule.any && rule.any.length > 0) {
        hasAnyPermission = rule.any.some((p) => user.permissions.includes(p));
    }

    if (hasAnyPermission) {
        return next(); // 조건 없이 통과
    }

    // 3. API Key 접근 차단 (API Key는 own 개념이 없으므로 여기까지 오면 무조건 권한 없음)
    if (user.type === 'apikey') {
        const identifier = user.key || 'Unknown';
        logger.warn(`[Permission Denied] API Key 접근 거부 (Key: ${identifier}, Req: ${collectionName}[${params.type}])`);
        return res.status(403).json({ok: false, message: 'API Key에 해당 데이터 접근 권한이 없습니다.'});
    }

    // 4. 'dept' 권한 검사 (부서 전용 ABAC 데이터 필터링)
    // dept 권한이 own 권한보다 넓은 범위이므로 먼저 검사하여 처리합니다.
    if (rule.dept && user.permissions.includes(rule.dept)) {
        if (!user.department_id) {
            logger.warn(`[Permission Denied] 부서 정보가 없는 유저의 부서 권한 접근 (User: ${user.userId})`);
            return res.status(403).json({ok: false, message: '소속 부서 정보가 없어 접근할 수 없습니다.'});
        }

        if (!params.option) params.option = {};
        const fieldName = rule.deptField || 'department_id';

        // 로그인 시 JWT에 담긴 부서 ID를 쿼리 조건에 강제 주입
        params.option[fieldName] = user.department_id;
        return next();
    }

    // 5. 'own' 권한 검사 (JWT 전용 ABAC 데이터 필터링)
    if (rule.own && user.permissions.includes(rule.own)) {
        if (!params.option) params.option = {};

        const fieldName = rule.ownField || 'email';

        // userId가 고유 식별자 역할을 하므로 이를 option에 강제 주입
        // (만약 스키마의 기준 필드가 다를 경우 ownField 설정을 변경하면 됨)
        params.option[fieldName] = user.userId;
        return next();
    }

    // 6. 모든 권한 검사 실패 시
    logger.warn(`[Permission Denied] 접근 권한 없음 (User: ${user.userId || 'Unknown'}, Req: ${collectionName}[${params.type}])`);
    return res.status(403).json({ok: false, message: '해당 기능을 사용할 권한이 없습니다.'});
};
