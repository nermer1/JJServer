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

        try {
            // authMiddleware에서 세팅해준 user 정보
            const authUser = (req as any).user;
            
            if (!authUser || !authUser.userId) {
                apiReturn.setReturnErrorMessage('인증 정보가 유효하지 않습니다.');
                res.status(401).json(apiReturn);
                return;
            }

            // 1. 유저 상세 정보 조회 (department 등 포함)
            const userDoc = await Users.model.findOne({ email: authUser.userId })
                .populate('department_id')
                .lean();

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
            
        } catch (error: any) {
            console.error('[UserController.getMe] 에러:', error);
            apiReturn.setReturnErrorMessage(error.message || '서버 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }
}

export default new UserController();
