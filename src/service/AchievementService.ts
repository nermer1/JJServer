import {eventBus} from '../utils/eventBus.js';
import {Users} from '../schemas/users.js';
import {PointHistories} from '../schemas/pointHistories.js';
import {Achievements} from '../schemas/achievements.js';
import LevelCacheService from './LevelCacheService.js';
import logger from '../utils/logger.js';

// ✅ 방법 A: 포인트 정책표 (상수로 관리)
// 여기서 모든 이벤트의 획득 포인트를 한눈에 관리합니다.
const POINT_POLICY = {
    API_KEY_CREATED: 50, // 최초 API 발급
    OTP_USED: 10 // OTP 인증 성공
};

class AchievementService {
    public init() {
        // 1. API 키 발급 이벤트 리스너
        eventBus.on('API_KEY_CREATED', async (payload) => {
            const {userId, apiKeyId} = payload;
            logger.info(`[Achievement] Checking API_KEY_CREATED for user: ${userId}`);

            try {
                // 1. 포인트 정책표에서 점수 가져오기
                const pointToGive = POINT_POLICY.API_KEY_CREATED;

                // 2. 유저 포인트 및 누적 경험치 동시 지급 ($inc)
                const updatedUser = await Users.model.findByIdAndUpdate(
                    userId,
                    {$inc: {currentPoint: pointToGive, totalExp: pointToGive}},
                    {new: true} // 업데이트된 최신 정보 반환
                );

                if (updatedUser) {
                    // 레벨업 계산
                    const newLevel = LevelCacheService.calculateLevel(updatedUser.totalExp);
                    if (newLevel > updatedUser.level) {
                        await Users.model.findByIdAndUpdate(userId, {$set: {level: newLevel}});
                        eventBus.emit('LEVEL_UP', {userId, oldLevel: updatedUser.level, newLevel});
                        logger.info(`[Achievement] User ${userId} leveled up to ${newLevel}!`);
                    }
                }

                // 3. 포인트 내역 저장 (히스토리)
                await PointHistories.model.create({
                    userId,
                    point: pointToGive,
                    reason: '업적 달성: 최초 API 발급',
                    relatedId: apiKeyId
                });

                // 4. 업적 언락 (만약 FIRST_API_KEY 업적을 달성했다면)
                const achievement = await Achievements.model.findOne({code: 'FIRST_API_KEY'});
                if (achievement) {
                    // 이미 업적이 있는지 검사 후 없으면 push (Mongoose의 $addToSet 사용)
                    await Users.model.findByIdAndUpdate(userId, {
                        $addToSet: {
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
            } catch (err: any) {
                logger.error(`[Achievement] Error handling API_KEY_CREATED event: ${err.message}`);
            }
        });

        // 2. OTP 사용 이벤트 리스너
        eventBus.on('OTP_USED', async (payload) => {
            const {userId, otpId} = payload;
            logger.info(`[Achievement] Checking OTP_USED for user: ${userId}`);

            try {
                const pointToGive = POINT_POLICY.OTP_USED;

                // 포인트 및 경험치 동시 지급
                const updatedUser = await Users.model.findByIdAndUpdate(userId, {$inc: {currentPoint: pointToGive, totalExp: pointToGive}}, {new: true});

                if (updatedUser) {
                    const newLevel = LevelCacheService.calculateLevel(updatedUser.totalExp);
                    if (newLevel > updatedUser.level) {
                        await Users.model.findByIdAndUpdate(userId, {$set: {level: newLevel}});
                        eventBus.emit('LEVEL_UP', {userId, oldLevel: updatedUser.level, newLevel});
                        logger.info(`[Achievement] User ${userId} leveled up to ${newLevel}!`);
                    }
                }

                // 내역 저장
                await PointHistories.model.create({
                    userId,
                    point: pointToGive,
                    reason: '일일 미션: OTP 인증 사용',
                    relatedId: otpId
                });

                // OTP 관련 업적이 있다면 여기에 추가 로직 작성...
            } catch (err: any) {
                logger.error(`[Achievement] Error handling OTP_USED event: ${err.message}`);
            }
        });

        logger.info('[AchievementService] Event listeners initialized.');
    }
}

export const achievementService = new AchievementService();

