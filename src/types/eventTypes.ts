export const EVENT_TYPES = {
    USER_REGISTERED: 'USER_REGISTERED',
    API_KEY_CREATED: 'API_KEY_CREATED',
    OTP_USED: 'OTP_USED',
    ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
    LEVEL_UP: 'LEVEL_UP'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// 각 이벤트별 Payload(전달될 데이터) 타입 정의
export interface EventPayloads {
    [EVENT_TYPES.USER_REGISTERED]: { userId: string };
    [EVENT_TYPES.API_KEY_CREATED]: { userId: string; apiKeyId: string };
    [EVENT_TYPES.OTP_USED]: { userId: string; otpId?: string };
    [EVENT_TYPES.ACHIEVEMENT_UNLOCKED]: { 
        userId: string; 
        achievementCode: string; 
        rewardPoint: number 
    };
    [EVENT_TYPES.LEVEL_UP]: {
        userId: string;
        oldLevel: number;
        newLevel: number;
    };
}
