import {Permission} from '../schemas/permission.js';
import {Role} from '../schemas/role.js';
import PermissionCacheService from './PermissionCacheService.js';
import {withJobLogging} from '../utils/JobLogger.js';

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

            // 현재는 스케줄러가 정상적으로 구동되었는지(생존 체크) 확인하기 위해 무조건 로그를 남깁니다.
            return {
                success: true,
                message: missingIds.length > 0 ? '권한 동기화 완료' : '권한이 이미 최신 상태입니다.',
                updatedCount: missingIds.length
            };
        } catch (error: any) {
            // 에러를 던져서 매니저가 에러 로그를 남기게 함
            throw error;
        }
    }
}

const instance = new PermissionSyncService();
export default instance;

export const syncAdminPermissionsJob = withJobLogging(
    instance.syncAdminPermissions.bind(instance),
    {
        category: 'SYNC',
        action: '권한 동기화 (SYSTEM_ADMIN)',
        target: 'permissions',
        actionType: 'EXECUTE'
    }
);

