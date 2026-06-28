import {Permission} from '../schemas/permission.js';
import {Role} from '../schemas/role.js';
import PermissionCacheService from './PermissionCacheService.js';

import {DBLogger} from '../utils/DBLogger.js';

class PermissionSyncService {
    /**
     * Permission 컬렉션의 모든 권한을 시스템 최고 관리자('SYSTEM_ADMIN')에게 동기화합니다.
     * 외부(Mongo Shell 등)에서 강제 삽입된 권한 데이터 누락을 방지합니다.
     */
    async syncAdminPermissions(options?: {userId?: string; trigger?: string}) {
        const targetRoleName = 'SYSTEM_ADMIN';
        const userId = options?.userId || 'SYSTEM';
        const trigger = options?.trigger || 'scheduler';
        try {
            // 1. 등록된 모든 권한 가져오기
            const permissions = await Permission.model.find({}, {_id: 1});
            const permissionIds: any[] = permissions.map((p) => p._id);

            if (permissionIds.length === 0) {
                return {success: true, message: '등록된 권한이 없습니다.', updatedCount: 0};
            }

            // 2. 타겟 Role 찾기 (타입스크립트 경고 방지를 위해 any 타입 지정)
            const role: any = await Role.model.findOne({name: targetRoleName});

            if (!role) {
                return {success: false, message: `타겟 Role(${targetRoleName})을 찾을 수 없습니다.`, updatedCount: 0};
            }

            // 3. 누락된 권한이 있는지 확인
            const existingPermIds = role.permissions.map((p: any) => p.toString());
            const missingIds = permissionIds.filter((id) => !existingPermIds.includes(id.toString()));

            if (missingIds.length > 0) {
                // 4. 권한 업데이트
                await Role.model.findByIdAndUpdate(role._id, {$addToSet: {permissions: {$each: missingIds}}});
                await PermissionCacheService.clearCacheByRoleId(role._id.toString());
            }

            // [로깅 철학]
            // 스케줄러가 주기적으로 도는데 매번 0건이어도 DB에 로그를 찍으면 '로그 스팸(Noise)'이 됩니다.
            // 따라서 1) 수동 트리거(manual)로 사람이 직접 눌렀거나, 2) 실제로 업데이트된 내역이 있을 때만 DB에 기록합니다.
            if (missingIds.length > 0 || trigger === 'manual') {
                await DBLogger.log({
                    category: 'SYNC',
                    action: `권한 동기화 실행 (${targetRoleName})`,
                    userId,
                    details: {trigger, addedCount: missingIds.length},
                    status: 'SUCCESS'
                });
            }

            return {
                success: true,
                message: missingIds.length > 0 ? '권한 동기화 완료' : '권한이 이미 최신 상태입니다.',
                updatedCount: missingIds.length
            };
        } catch (error: any) {
            await DBLogger.log({
                category: 'SYNC',
                action: '권한 동기화 실패',
                userId,
                details: {trigger, error: error?.message || String(error)},
                status: 'FAIL'
            });

            return {success: false, message: '권한 동기화 중 에러가 발생했습니다.', updatedCount: 0, error};
        }
    }
}

export default new PermissionSyncService();

