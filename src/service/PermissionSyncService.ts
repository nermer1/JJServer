import {Permission} from '../schemas/permission.js';
import {Role} from '../schemas/role.js';
import PermissionCacheService from './PermissionCacheService.js';

class PermissionSyncService {
    /**
     * Permission 컬렉션의 모든 권한을 특정 Role(기본: 'ADMIN')에 동기화합니다.
     * 외부(Mongo Shell 등)에서 강제 삽입된 권한 데이터 누락을 방지합니다.
     */
    async syncAdminPermissions(targetRoleName = 'SYSTEM_ADMIN') {
        try {
            // 1. 등록된 모든 권한 가져오기
            const permissions = await Permission.model.find({}, {_id: 1});
            const permissionIds: any[] = permissions.map((p) => p._id);

            if (permissionIds.length === 0) {
                console.log('[PermissionSyncService] 등록된 권한이 없습니다.');
                return {success: true, message: '등록된 권한이 없습니다.', updatedCount: 0};
            }

            // 2. 타겟 Role 찾기 (타입스크립트 경고 방지를 위해 any 타입 지정)
            const role: any = await Role.model.findOne({name: targetRoleName});

            if (!role) {
                console.log(`[PermissionSyncService] 타겟 Role(${targetRoleName})을 찾을 수 없습니다.`);
                return {success: false, message: `타겟 Role(${targetRoleName})을 찾을 수 없습니다.`, updatedCount: 0};
            }

            // 3. 누락된 권한이 있는지 확인
            const existingPermIds = role.permissions.map((p: any) => p.toString());
            const missingIds = permissionIds.filter((id) => !existingPermIds.includes(id.toString()));

            if (missingIds.length > 0) {
                // 4. 권한 업데이트
                await Role.model.findByIdAndUpdate(role._id, {$addToSet: {permissions: {$each: missingIds}}});

                // Mongoose hook(findOneAndUpdate)이 Role 모델에 설정되어 있다면 자동으로 캐시가 지워지지만,
                // 안전을 위해 명시적으로 캐시 클리어 호출
                await PermissionCacheService.clearCacheByRoleId(role._id.toString());

                console.log(`[PermissionSyncService] ${targetRoleName} 권한 동기화 완료. 누락된 권한 ${missingIds.length}개 추가됨.`);
                return {success: true, message: '권한 동기화 완료', updatedCount: missingIds.length};
            } else {
                console.log(`[PermissionSyncService] ${targetRoleName} 권한이 이미 최신 상태입니다.`);
                return {success: true, message: '권한이 이미 최신 상태입니다.', updatedCount: 0};
            }
        } catch (error) {
            console.error('[PermissionSyncService] 권한 동기화 중 에러 발생:', error);
            return {success: false, message: '권한 동기화 중 에러가 발생했습니다.', updatedCount: 0, error};
        }
    }
}

export default new PermissionSyncService();

