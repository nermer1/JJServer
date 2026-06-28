import {BaseSyncService} from './BaseSyncService.js';
import {Department} from '../../schemas/department.js';

interface HrApiDepartment {
    dept_id: string;     // 부서 코드
    dept_name: string;   // 부서 이름
    parent?: string;     // 상위 부서 코드 (실제 API 필드명: parent)
}

export class DepartmentSyncService extends BaseSyncService<HrApiDepartment> {
    protected apiUrl = 'http://192.168.12.211:4100/api/departments';
    protected model = Department.model;
    protected serviceName = '부서 동기화';

    protected async buildBulkOps(externalData: HrApiDepartment[]): Promise<any[]> {
        const bulkOps: any[] = [];

        for (const dept of externalData) {
            if (!dept.dept_id || !dept.dept_name) continue;

            bulkOps.push({
                updateOne: {
                    filter: {code: dept.dept_id},
                    update: {
                        $set: {
                            name: dept.dept_name,
                            parent_code: dept.parent || null
                        }
                    },
                    upsert: true
                }
            });
        }
        return bulkOps;
    }

    /**
     * 동기화가 완료된 후 2차로 parent_code를 기반으로 parent_id(ObjectId)를 업데이트합니다.
     */
    public async sync(params?: Record<string, any>): Promise<void> {
        // 1. BaseSyncService의 기본 동기화 실행 (모든 부서 Upsert 및 parent_code 세팅 완료)
        await super.sync(params);

        // 2. 부모 자식 계층(ObjectId) 2차 매핑
        const allDepts = await this.model.find({}).lean();
        const deptMapByCode = new Map(allDepts.map((d: any) => [d.code, d._id]));

        const parentIdBulkOps: any[] = [];

        for (const dept of allDepts) {
            // 루트 부서(parent_code가 없거나 '00' 같은 가짜 코드인 경우 제외)
            if (!dept.parent_code || dept.parent_code === '00') continue;

            const actualParentObjectId = deptMapByCode.get(dept.parent_code);

            if (actualParentObjectId && String(dept.parent_id) !== String(actualParentObjectId)) {
                parentIdBulkOps.push({
                    updateOne: {
                        filter: { _id: dept._id },
                        update: { $set: { parent_id: actualParentObjectId } }
                    }
                });
            }
        }

        if (parentIdBulkOps.length > 0) {
            const result = await this.model.bulkWrite(parentIdBulkOps);
            // logger.info 대신 console 사용(임시) 또는 상단 import 활용 가능
            console.log(`[부서 동기화] 부모-자식(parent_id) 계층 매핑 완료: ${result.modifiedCount}건 수정됨`);
        }
    }
}
