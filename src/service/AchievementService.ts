import { eventBus } from '../utils/eventBus.js';
// DB Models - adjust imports based on your actual data access layer
// import { Users } from '../schemas/users.js';
// import { PointHistories } from '../schemas/pointHistories.js';
// import { Achievements } from '../schemas/achievements.js';

class AchievementService {
    public init() {
        // 1. API 키 발급 이벤트 리스너
        eventBus.on('API_KEY_CREATED', async (payload) => {
            const { userId, apiKeyId } = payload;
            console.log(`[Achievement] Checking API_KEY_CREATED for user: ${userId}`);
            
            // TODO: 실제 구현 시 주석 해제 및 로직 완성
            /*
            try {
                // 1. 포인트 지급
                const pointToGive = 50;
                await Users.model.findByIdAndUpdate(userId, { $inc: { currentPoint: pointToGive } });
                
                // 2. 포인트 내역 저장
                await PointHistories.model.create({
                    userId,
                    point: pointToGive,
                    reason: '업적 달성: 최초 API 발급',
                    relatedId: apiKeyId
                });

                // 3. 업적 언락 (만약 FIRST_API_KEY 업적을 달성했다면)
                const achievement = await Achievements.model.findOne({ code: 'FIRST_API_KEY' });
                if (achievement) {
                    await Users.model.findByIdAndUpdate(userId, {
                        $push: { 
                            unlockedAchievements: { 
                                achievementId: achievement._id, 
                                unlockedAt: new Date() 
                            } 
                        }
                    });
                    
                    // 연쇄 이벤트 발행 (선택사항, 알림 등을 위해)
                    eventBus.emit('ACHIEVEMENT_UNLOCKED', {
                        userId,
                        achievementCode: achievement.code,
                        rewardPoint: pointToGive
                    });
                }
            } catch (err) {
                console.error('[Achievement] Error handling API_KEY_CREATED event', err);
            }
            */
        });

        // 2. 다른 이벤트들 추가...
        eventBus.on('OTP_USED', async (payload) => {
            const { userId } = payload;
            console.log(`[Achievement] Checking OTP_USED for user: ${userId}`);
            // 로직 작성...
        });
        
        console.log('[AchievementService] Event listeners initialized.');
    }
}

export const achievementService = new AchievementService();
