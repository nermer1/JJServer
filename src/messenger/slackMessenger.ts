/* eslint-disable */
import {WebClient, ChatPostMessageResponse, KnownBlock, Block} from '@slack/web-api';

// 1. 파라미터 타입 정의 (Java의 DTO 대체)
// 물음표(?)는 null일 수도 있다는 뜻 (Optional)
interface MessengerTarget {
    channelId?: string;
    email?: string;
    message: string | (KnownBlock | Block)[]; // 메시지는 문자열일 수도, 블록 배열일 수도 있음
}

export class SlackMessenger {
    private client: WebClient;

    constructor(token: string) {
        if (!token) throw new Error('Slack Token is required!');
        this.client = new WebClient(token);
    }

    /**
     * 내부 헬퍼: 채널 ID나 이메일을 받아서 실제 전송할 ID(channelId)를 리턴
     */
    private async resolveId(target: {channelId?: string; email?: string}): Promise<string> {
        // 1. 채널 ID가 명확히 있으면 그거 씀
        if (target.channelId) {
            return target.channelId;
        }

        // 2. 이메일만 있으면 슬랙 API로 유저 ID 조회
        if (target.email) {
            try {
                const result = await this.client.users.lookupByEmail({email: target.email});
                if (result.ok && result.user?.id) {
                    return result.user.id;
                }
            } catch (error) {
                console.warn(`[Slack] 이메일(${target.email}) 조회 실패:`, error);
            }
        }

        throw new Error('유효한 Channel ID 또는 Email이 없습니다.');
    }

    /**
     * 텍스트 메시지 전송
     */
    public async sendMessage(params: MessengerTarget): Promise<ChatPostMessageResponse> {
        try {
            const targetId = await this.resolveId(params);

            // 타입 가드: 텍스트 전송인데 message가 블록 배열이면 에러 or 변환
            const textMessage = typeof params.message === 'string' ? params.message : JSON.stringify(params.message); // 혹시 몰라 stringify 처리

            const response = await this.client.chat.postMessage({
                channel: targetId,
                text: textMessage
            });

            return response;
        } catch (error: any) {
            throw new Error(`[Slack Text Error] ${error.message}`);
        }
    }

    /**
     * 카드(Block Kit) 메시지 전송
     */
    public async sendCardMessage(params: MessengerTarget): Promise<ChatPostMessageResponse> {
        try {
            const targetId = await this.resolveId(params);
            let blocks: (KnownBlock | Block)[];

            // 입력값이 JSON 문자열이면 파싱, 아니면 그대로 사용
            if (typeof params.message === 'string') {
                blocks = JSON.parse(params.message);
            } else {
                blocks = params.message;
            }

            const response = await this.client.chat.postMessage({
                channel: targetId,
                blocks: blocks,
                text: '카드 메시지가 도착했습니다.' // 모바일 푸시 알림용
            });

            return response;
        } catch (error: any) {
            throw new Error(`[Slack Card Error] ${error.message}`);
        }
    }
}
