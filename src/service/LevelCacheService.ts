import { LevelPolicies } from '../schemas/levelPolicies.js';
import logger from '../utils/logger.js';

interface LevelPolicy {
    level: number;
    requiredPoint: number;
}

class LevelCacheService {
    private cachedPolicies: LevelPolicy[] = [];

    /**
     * DB에서 레벨 정책표를 읽어와 메모리에 로드 (레벨 내림차순 정렬)
     * 서버 기동 시 및 캐시 초기화 시 호출됨
     */
    public async loadCache(): Promise<void> {
        try {
            // 요구 포인트가 가장 높은 레벨부터 거꾸로 저장해두면, 나중에 내 포인트로 레벨 찾을 때 편합니다.
            const policies = await LevelPolicies.model.find().sort({ level: -1 }).lean();
            
            this.cachedPolicies = policies.map((p: any) => ({
                level: p.level,
                requiredPoint: p.requiredPoint
            }));
            
            logger.info(`[LevelCache] 로드 완료: ${this.cachedPolicies.length}개의 레벨 정책 등록됨`);
        } catch (error: any) {
            logger.error(`[LevelCache] 로드 실패: ${error.message}`);
        }
    }

    /**
     * 내 누적 경험치(totalExp)를 기반으로 달성 가능한 최대 레벨을 계산하여 반환
     * (캐싱된 데이터를 사용하므로 DB 쿼리 발생 안 함)
     */
    public calculateLevel(totalExp: number): number {
        if (this.cachedPolicies.length === 0) {
            return 1; // 룰이 하나도 없으면 무조건 1레벨 반환
        }

        // 높은 레벨부터 순회하면서, 내 경험치가 요구치보다 크거나 같으면 그 레벨임
        for (const policy of this.cachedPolicies) {
            if (totalExp >= policy.requiredPoint) {
                return policy.level;
            }
        }
        
        return 1; // 조건에 맞는 게 없으면 1레벨
    }
}

export default new LevelCacheService();
