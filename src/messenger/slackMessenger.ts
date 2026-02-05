/* eslint-disable */
import {WebClient, ChatPostMessageResponse, KnownBlock, Block} from '@slack/web-api';

interface MessengerTarget {
    channelId?: string;
    email?: string;
    message: string | (KnownBlock | Block)[];
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
        if (target.channelId) {
            return target.channelId;
        }

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
            const textMessage = typeof params.message === 'string' ? params.message : JSON.stringify(params.message);
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

            if (typeof params.message === 'string') {
                blocks = JSON.parse(params.message);
            } else {
                blocks = params.message;
            }

            const response = await this.client.chat.postMessage({
                channel: targetId,
                blocks: blocks,
                text: '카드 메시지가 도착했습니다.'
            });

            return response;
        } catch (error: any) {
            throw new Error(`[Slack Card Error] ${error.message}`);
        }
    }
}
