import {Request, Response} from 'express';
import ApiReturn from '../structure/ApiReturn.js';
import {Users} from '../schemas/users.js';
import MenuService from '../service/MenuService.js';
import prdApiService from '../service/PrdApiService.js';
import PermissionCacheService from '../service/PermissionCacheService.js';
import {DBLogger} from '../utils/DBLogger.js';
import logger from '../utils/logger.js';
import HypervSocketService from '../service/HypervSocketService.js';

class UserController {
    /**
     * 만능 라우터(PrdApiController)를 대체할 도메인 전용 핸들러
     * 프론트엔드의 /api/v1/prd/users 요청을 가로채어 처리합니다.
     */
    public async call(req: Request, res: Response): Promise<void> {
        const params = req.body;
        const reqUser = (req as any).user;
        (params as any).reqUser = reqUser; // 내부 스키마 처리를 위해 주입

        try {
            // 1. 하극상 방지 로직 (마법 제거 및 명시적 처리)
            if (params.type === 'C' || params.type === 'U') {
                await this.validateRoleHierarchy(params, reqUser);
            }

            // 2. DB 비즈니스 로직 위임 (기존 PrdApiService 재사용)
            const returnData = await prdApiService.call('users', params);

            // 3. 작업 완료 후 명시적 훅(Hook) 캐시 처리 및 로깅
            if (params.type && params.type !== 'R') {
                const actionNameMap: Record<string, string> = {C: '생성', U: '수정', D: '삭제'};
                const actionTypeMap: Record<string, string> = {C: 'CREATE', U: 'UPDATE', D: 'DELETE'};

                await DBLogger.log({
                    category: 'DATA',
                    action: `users 데이터 ${actionNameMap[params.type] || params.type}`,
                    target: 'users',
                    actionType: actionTypeMap[params.type] || 'EXECUTE',
                    userId: reqUser?.userId || 'UNKNOWN',
                    details: params.data
                });

                // 명시적으로 캐시 삭제 (email 기준)
                let targetEmail = '';
                const inputData = Array.isArray(params.data.tableData) ? params.data.tableData[0] : params.data.tableData;
                if (inputData && inputData.email) {
                    targetEmail = inputData.email;
                } else if (inputData && inputData._id) {
                    const doc = await Users.model.findById(inputData._id).lean();
                    if (doc) targetEmail = doc.email;
                }

                if (targetEmail) {
                    await PermissionCacheService.clearUserCache(targetEmail);
                    logger.info(`[UserController] ${targetEmail} 유저의 권한 캐시 리로드 완료`);
                }

                // HypervSocketService의 유저/호스트 메모리 캐시 명시적 삭제 (실시간 반영)
                HypervSocketService.clearHostDataCache();
            }

            res.json(returnData);
        } catch (error: any) {
            logger.error(`[UserController] 에러 발생: ${error.message}`);
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(error.message);
            res.json(apiReturn);
        }
    }

    /**
     * 권한 부여 시 하극상(Privilege Escalation)을 방지하는 명시적 로직
     */
    private async validateRoleHierarchy(params: any, reqUser: any) {
        let inputData: any = params.data.tableData;
        if (Array.isArray(inputData)) inputData = inputData[0];
        if (!inputData || !inputData.roles) return;
        if (!reqUser || reqUser.level === undefined) return;

        if (!reqUser.permissions?.includes('system:admin')) {
            delete inputData.roles;
            return;
        }

        const {Role} = await import('../schemas/role.js');
        const targetRoles = await Role.model.find({_id: {$in: inputData.roles}}).lean();
        let targetMaxLevel = 0;
        targetRoles.forEach((r: any) => {
            if (r.level && r.level > targetMaxLevel) {
                targetMaxLevel = r.level;
            }
        });

        if (targetMaxLevel > reqUser.level) {
            throw new Error(`본인의 권한 레벨(${reqUser.level})을 초과하는 롤(Level: ${targetMaxLevel})은 부여할 수 없습니다.`);
        }
    }

    /**
     * 내 정보, 권한, 동적 메뉴 조회
     */
    public async getMe(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();

        // authMiddleware에서 세팅해준 user 정보
        const authUser = (req as any).user;

        if (!authUser || !authUser.userId) {
            apiReturn.setReturnErrorMessage('인증 정보가 유효하지 않습니다.');
            res.status(401).json(apiReturn);
            return;
        }

        // 1. 유저 상세 정보 조회 (department 등 포함)
        const userDoc = await Users.model.findOne({email: authUser.userId}).populate('department_id').lean();

        if (!userDoc) {
            apiReturn.setReturnErrorMessage('해당 유저 정보를 찾을 수 없습니다.');
            res.status(404).json(apiReturn);
            return;
        }

        // 2. 권한 정보 추출
        const permissions = authUser.permissions || [];

        // 3. 권한 기반 동적 메뉴 생성
        const userMenu = await MenuService.generateUserMenu(permissions);

        // 4. 응답 데이터 구성
        const myInfo = {
            id: userDoc._id,
            email: userDoc.email,
            name: userDoc.name,
            nickname: userDoc.nickname,
            position: userDoc.position,
            title: userDoc.title,
            department: userDoc.department_id,
            permissions: permissions,
            menu: userMenu
        };

        apiReturn.put('user', myInfo);
        apiReturn.setReturnMessage('내 정보 조회 성공');
        res.json(apiReturn);
    }

    /**
     * 사내 주소록(연락처) 전용 조회 API
     * 모든 유저의 이름, 이메일, 내선번호, 부서 정보 등 안전한 정보만 리턴
     */
    public async getContacts(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();

        // 안전한 필드만 프로젝션 (비밀번호, 개인 설정 등 민감 정보 제외)
        const users = await Users.model.find({}).select('name nickname email extension position title department_id').populate('department_id').lean();

        apiReturn.put('contacts', users);
        apiReturn.setReturnMessage('주소록 조회 성공');
        res.json(apiReturn);
    }
    /**
     * 외부 HR 시스템 연동 수동 실행 (어드민용)
     */
    public async syncHrData(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        const {syncHrDataJob} = await import('../scheduler/hrSyncScheduler.js');
        const userId = (req as any).user?.userId || 'SYSTEM';

        try {
            // 스케줄러 잡 즉시 실행 (수동 트리거임을 파라미터로 명시)
            // 래핑된 Job이 내부적으로 로깅 처리를 알아서 다 해줍니다.
            await syncHrDataJob({trigger: 'manual', userId});

            apiReturn.setReturnMessage('인사 정보 수동 동기화가 정상적으로 처리되었습니다.');
            res.json(apiReturn);
        } catch (error: any) {
            apiReturn.setReturnErrorMessage('인사 정보 동기화 중 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }
}

export default new UserController();
