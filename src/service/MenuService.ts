import logger from '../utils/logger.js';

/**
 * 프론트엔드의 ROUTES 상수와 매핑될 URL 문자열
 * 실제 프론트엔드의 ROUTES 객체 값과 동일하게 맞춰야 합니다.
 */
const ROUTES = {
    HOME: '/',
    CUSTOMER: '/customer',
    CALENDAR: '/calendar',
    UTILITY_ESTIMATION: '/utility/estimation',
    AI_KNOWLEDGE: '/ai/knowledge',
    UTILITY_IP: '/utility/ip',
    UTILITY_API_KEYS: '/utility/apikeys',
    UTILITY_LICENSE: '/utility/license',
    UTILITY_GUIDE_GENERATOR: '/utility/guide',
    UTILITY_PASSWORD: '/utility/password',
    UTILITY_GITLOG: '/utility/gitlog',
    INTERVIEW_QUIZ_QUIZ: '/interview/quiz',
    INTERVIEW_QUIZ_SUBMIT_LIST: '/interview/submit',
    UPDATE_HISTORY: '/update-history',
    DATABASE_CUSTOMER: '/db/customer',
    DATABASE_GITLAB: '/db/gitlab',
    DATABASE_USER: '/db/user',
    DATABASE_API_STRUCTURE: '/db/api-structure',
};

// 메뉴 아이템 타입 정의
export interface MenuItem {
    title: string;
    url: string;
    icon?: string;
    tutorialId?: string;
    requiredPermission?: string | string[]; // 하나라도 문자열이 있거나 여러 개 중 하나라도 맞으면 통과 (선택적)
    items?: MenuItem[]; // 하위 메뉴
}

export interface MenuTree {
    navMain: MenuItem[];
    navMain2: MenuItem[];
    projects: MenuItem[];
}

/**
 * 서비스의 마스터 메뉴 트리
 * 권한 제어가 필요한 메뉴는 `requiredPermission`을 명시합니다.
 * 명시되지 않은 메뉴는 누구나 볼 수 있는 공용 메뉴입니다.
 */
class MenuService {
    /**
     * 유저가 가진 권한(permissions) 배열을 바탕으로 볼 수 있는 메뉴만 필터링하여 반환합니다.
     */
    public async generateUserMenu(userPermissions: string[]): Promise<MenuTree> {
        // 1. DB에서 마스터 메뉴 긁어오기 (없으면 원자적으로 시드 데이터 insert)
        const { Menus } = await import('../schemas/menus.js');
        const { Permission } = await import('../schemas/permission.js');
        
        let masterMenuDoc = await Menus.model.findOne({ portalName: 'default' }).lean();

        // DB에서 권한 정보를 가져와 _id -> action 매핑 생성
        const permissions = await Permission.model.find({}).lean() as Array<{ _id: any, action: string }>;
        const permissionMap = new Map<string, string>();
        permissions.forEach(p => {
            permissionMap.set(p._id.toString(), p.action);
        });

        // DB에 데이터가 없으면 빈 메뉴를 기본값으로 사용 (DB 자동 인서트 안 함)
        const MASTER_MENU = (masterMenuDoc as unknown as MenuTree) || {
            navMain: [],
            navMain2: [],
            projects: []
        };
        const hasPermission = (required?: string | string[]) => {
            if (!required || (Array.isArray(required) && required.length === 0)) {
                return true; 
            }
            
            if (Array.isArray(required)) {
                // 여러 권한 중 하나라도 있으면 통과 (OR 조건)
                return required.some(p => {
                    const action = permissionMap.get(p.toString());
                    return action ? userPermissions.includes(action) : false;
                });
            }
            
            // 단일 권한 검사
            const action = permissionMap.get(required.toString());
            return action ? userPermissions.includes(action) : false;
        };

        const filterItems = (items: MenuItem[]): MenuItem[] => {
            return items.reduce((acc: MenuItem[], item) => {
                // 1. 현재 메뉴 아이템 자체의 권한 검사
                if (!hasPermission(item.requiredPermission)) {
                    return acc; // 권한 없으면 버림
                }

                const newItem = { ...item };

                // 2. 하위 메뉴(items)가 있다면 재귀적으로 필터링
                if (newItem.items && newItem.items.length > 0) {
                    newItem.items = filterItems(newItem.items);
                    
                    // 하위 메뉴가 있었는데 필터링 결과 다 날아갔다면 
                    // 부모 메뉴(빈 껍데기)도 숨길지 말지 결정 (보통 숨김)
                    if (newItem.items.length === 0) {
                        return acc;
                    }
                }

                acc.push(newItem);
                return acc;
            }, []);
        };

        return {
            navMain: filterItems(MASTER_MENU.navMain),
            navMain2: filterItems(MASTER_MENU.navMain2),
            projects: filterItems(MASTER_MENU.projects),
        };
    }
}

export default new MenuService();
