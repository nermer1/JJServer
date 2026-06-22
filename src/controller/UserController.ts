import {Request, Response} from 'express';
import ApiReturn from '../structure/ApiReturn.js';
import {Users} from '../schemas/users.js';
import MenuService from '../service/MenuService.js';

class UserController {
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
        
        // 스케줄러 잡 즉시 실행
        await syncHrDataJob();
        
        apiReturn.setReturnMessage('인사 정보 수동 동기화가 정상적으로 트리거되었습니다. (결과는 로그 참조)');
        res.json(apiReturn);
    }
}

export default new UserController();

