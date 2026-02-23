/* eslint-disable */
import {WebClient, ChatPostMessageResponse, KnownBlock, Block, UsersListResponse} from '@slack/web-api';
import ArrayUtils from '../../utils/ArrayUtils.js';

type SlackMember = NonNullable<UsersListResponse['members']>[number];

interface MessengerTarget {
    channelId?: string;
    email?: string;
    message: string | (KnownBlock | Block)[];
}

interface BroadcastResult {
    total: number;
    successCount: number;
    failures: {target: string; error: string}[];
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
     * 워크스페이스의 모든 사용자 목록 가져오기 (페이지네이션 자동 처리)
     */
    public async getUserList(): Promise<SlackMember[]> {
        try {
            const allMembers: SlackMember[] = [];
            for await (const page of this.client.paginate('users.list')) {
                const response = page as UsersListResponse;
                if (response.members) {
                    allMembers.push(...response.members);
                }
            }

            return allMembers;
        } catch (error: any) {
            throw new Error(`[Slack UserList Error] ${error.message}`);
        }
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

    public async broadcast(targets: MessengerTarget[], commonMessage: string | (KnownBlock | Block)[], chunkSize: number = 20): Promise<BroadcastResult> {
        const result: BroadcastResult = {total: targets.length, successCount: 0, failures: []};

        const processResults = await ArrayUtils.processInChunks(
            targets,
            chunkSize,
            async (target) => {
                // 에러 로깅용 키 (ID가 없으면 이메일, 그것도 없으면 unknown)
                const targetKey = target.channelId || target.email || 'unknown';

                try {
                    // 1. ID 해석 (Channel ID 변환)
                    const channelId = await this.resolveId(target);

                    // 2. 보낼 메시지 결정 (개별 메시지 우선 > 없으면 공통 메시지)
                    const msgContent = target.message || commonMessage;

                    if (!msgContent) {
                        throw new Error('전송할 메시지 내용이 없습니다.');
                    }

                    // 3. Payload 구성
                    // chat.postMessage에 들어갈 객체 생성
                    const payload: any = {channel: channelId};

                    if (typeof msgContent === 'string') {
                        // 문자열이면 일반 텍스트로 전송
                        payload.text = msgContent;
                    } else {
                        // 배열이면 블록(카드) 메시지로 전송
                        payload.blocks = msgContent;
                        payload.text = '새로운 알림이 도착했습니다.'; // 모바일 푸시 알림용 Fallback 텍스트
                    }

                    // 4. 전송
                    await this.client.chat.postMessage(payload);

                    // 성공 리턴
                    return {success: true, target: channelId};
                } catch (e: any) {
                    // 실패 리턴 (에러 메시지 포함)
                    return {
                        success: false,
                        target: targetKey,
                        error: e.message || 'Unknown Error'
                    };
                }
            },
            1000 // 1초 대기 (Rate Limit 보호)
        );

        // 5. 결과 집계
        processResults.forEach((r) => {
            if (r.success) {
                result.successCount++;
            } else {
                result.failures.push({target: r.target, error: r.error});
            }
        });

        return result;
    }
}
