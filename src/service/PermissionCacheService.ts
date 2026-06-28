import redisTest from '../db/RedisTest.js';
import {Users} from '../schemas/users.js';
import {ApiKeys} from '../schemas/apiKeys.js';
import logger from '../utils/logger.js';

class PermissionCacheService {
    private readonly TTL_SECONDS = 24 * 60 * 60; // 24시간

    /**
     * 유저의 권한 배열과 최대 레벨을 Redis에 캐싱합니다.
     */
    public async cacheUserPermissions(userId: string, data: {permissions: string[], level: number}): Promise<void> {
        try {
            await redisTest.set(`perms:${userId}`, JSON.stringify(data), {EX: this.TTL_SECONDS});
        } catch (error) {
            logger.error(`Permission cache set error for user ${userId}: ${error}`);
        }
    }

    /**
     * Redis에서 유저의 권한과 레벨을 조회합니다.
     * 만약 캐시가 없으면(또는 몽고DB 훅에 의해 지워졌다면) DB를 조회하여 다시 캐싱합니다. (무중단 갱신)
     */
    public async getCachedPermissions(userId: string): Promise<{permissions: string[], level: number}> {
        try {
            const cached = await redisTest.get(`perms:${userId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                // 기존 배열 형태(string[]) 캐시가 남아있는 경우 하위 호환 처리
                if (Array.isArray(parsed)) {
                    return { permissions: parsed, level: 0 };
                }
                return parsed;
            }

            // 캐시가 날아갔다면 DB에서 실시간 권한 재조회 (방식 1: 무중단 갱신)
            logger.info(`권한 캐시 만료됨(${userId}). DB에서 다시 읽어와서 캐시를 재건합니다.`);
            const data = await this.rebuildPermissionsFromDB(userId);
            
            // 재건된 권한과 레벨을 다시 캐싱
            await this.cacheUserPermissions(userId, data);
            return data;
        } catch (error) {
            logger.error(`Permission cache get error for user ${userId}: ${error}`);
            return { permissions: [], level: 0 }; // 에러 시 안전하게 리턴 (접근 차단)
        }
    }

    /**
     * 특정 유저의 권한 캐시를 강제로 지웁니다.
     * (몽고DB Users 컬렉션 훅에서 자동으로 호출됨)
     */
    public async clearUserCache(userId: string): Promise<void> {
        try {
            await redisTest.del(`perms:${userId}`);
            logger.info(`유저(${userId})의 권한 캐시를 삭제했습니다.`);
        } catch (error) {
            logger.error(`Failed to clear cache for user ${userId}: ${error}`);
        }
    }

    /**
     * 특정 Role을 가진 모든 유저의 권한 캐시를 일괄 삭제합니다.
     * (몽고DB Role 컬렉션 훅에서 자동으로 호출됨)
     */
    public async clearCacheByRoleId(roleId: string): Promise<void> {
        try {
            const affectedUsers = await Users.model.find({ roles: roleId }, { email: 1 }).lean();
            for (const user of affectedUsers) {
                await this.clearUserCache(user.email);
            }
            logger.info(`역할(${roleId})이 변경되어 해당 역할이 있는 모든 유저의 캐시를 삭제했습니다.`);
        } catch (error) {
            logger.error(`Failed to clear cache by roleId ${roleId}: ${error}`);
        }
    }

    /**
     * DB에서 유저의 최신 Role과 Permission을 다시 Aggregate 합니다.
     */
    private async rebuildPermissionsFromDB(userId: string): Promise<{permissions: string[], level: number}> {
        const userDoc = await Users.model.findOne({email: userId}).populate({
            path: 'roles',
            populate: {
                path: 'permissions'
            }
        }).lean();

        if (!userDoc) return { permissions: [], level: 0 };

        const permissionsSet = new Set<string>();
        let maxRoleLevel = 0;

        if (userDoc.roles && Array.isArray(userDoc.roles)) {
            userDoc.roles.forEach((role: any) => {
                if (role.level && role.level > maxRoleLevel) {
                    maxRoleLevel = role.level;
                }
                if (role.permissions && Array.isArray(role.permissions)) {
                    role.permissions.forEach((perm: any) => {
                        if (perm.action) permissionsSet.add(perm.action);
                    });
                }
            });
        }
        return { permissions: Array.from(permissionsSet), level: maxRoleLevel };
    }

    // ==========================================
    // ⭐ API Key 캐싱 처리 로직
    // ==========================================

    /**
     * Redis에서 API Key 캐시(유저ID, 권한 등)를 조회합니다.
     */
    public async getCachedApiKey(token: string): Promise<{userId: string, permissions: string[]} | null> {
        try {
            const cached = await redisTest.get(`apikey:${token}`);
            if (cached) {
                return JSON.parse(cached);
            }

            // 캐시가 없으면 DB에서 재조회
            logger.info(`API Key 캐시 만료됨(${token}). DB에서 다시 읽어옵니다.`);
            const keyData = await this.rebuildApiKeyFromDB(token);
            
            if (keyData) {
                await redisTest.set(`apikey:${token}`, JSON.stringify(keyData), {EX: this.TTL_SECONDS});
            }
            return keyData;
        } catch (error) {
            logger.error(`API Key cache get error: ${error}`);
            return null;
        }
    }

    /**
     * 특정 API Key 캐시를 삭제합니다. (백오피스 수정 시 호출)
     */
    public async clearApiKeyCache(token: string): Promise<void> {
        try {
            await redisTest.del(`apikey:${token}`);
            logger.info(`API Key(${token})의 권한 캐시를 삭제했습니다.`);
        } catch (error) {
            logger.error(`Failed to clear cache for API Key: ${error}`);
        }
    }

    /**
     * DB에서 API Key 정보를 다시 읽어옵니다. (isActive가 false면 null 리턴)
     */
    private async rebuildApiKeyFromDB(token: string): Promise<{userId: string, permissions: string[]} | null> {
        const dbKey = await ApiKeys.model.findOne({key: token, isActive: true}).populate('permissions');
        if (!dbKey) return null;

        const permissions = dbKey.permissions ? dbKey.permissions.map((p: any) => p.action || p) : [];
        return {
            userId: dbKey.userId,
            permissions
        };
    }
}

export default new PermissionCacheService();
