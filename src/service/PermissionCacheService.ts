import redisTest from '../db/RedisTest.js';
import {Users} from '../schemas/users.js';
import logger from '../utils/logger.js';

class PermissionCacheService {
    private readonly TTL_SECONDS = 24 * 60 * 60; // 24시간

    /**
     * 유저의 권한 배열을 Redis에 캐싱합니다.
     */
    public async cacheUserPermissions(userId: string, permissions: string[]): Promise<void> {
        try {
            await redisTest.set(`perms:${userId}`, JSON.stringify(permissions), {EX: this.TTL_SECONDS});
        } catch (error) {
            logger.error(`Permission cache set error for user ${userId}: ${error}`);
        }
    }

    /**
     * Redis에서 유저의 권한을 조회합니다.
     * 만약 캐시가 없으면(또는 몽고DB 훅에 의해 지워졌다면) DB를 조회하여 다시 캐싱합니다. (무중단 갱신)
     */
    public async getCachedPermissions(userId: string): Promise<string[]> {
        try {
            const cached = await redisTest.get(`perms:${userId}`);
            if (cached) {
                return JSON.parse(cached);
            }

            // 캐시가 날아갔다면 DB에서 실시간 권한 재조회 (방식 1: 무중단 갱신)
            logger.info(`권한 캐시 만료됨(${userId}). DB에서 다시 읽어와서 캐시를 재건합니다.`);
            const permissions = await this.rebuildPermissionsFromDB(userId);
            
            // 재건된 권한을 다시 캐싱
            await this.cacheUserPermissions(userId, permissions);
            return permissions;
        } catch (error) {
            logger.error(`Permission cache get error for user ${userId}: ${error}`);
            return []; // 에러 시 안전하게 빈 배열 리턴 (접근 차단)
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
    private async rebuildPermissionsFromDB(userId: string): Promise<string[]> {
        const userDoc = await Users.model.findOne({email: userId}).populate({
            path: 'roles',
            populate: {
                path: 'permissions'
            }
        }).lean();

        if (!userDoc) return [];

        const permissionsSet = new Set<string>();
        if (userDoc.roles && Array.isArray(userDoc.roles)) {
            userDoc.roles.forEach((role: any) => {
                if (role.permissions && Array.isArray(role.permissions)) {
                    role.permissions.forEach((perm: any) => {
                        if (perm.action) permissionsSet.add(perm.action);
                    });
                }
            });
        }
        return Array.from(permissionsSet);
    }
}

export default new PermissionCacheService();
