/* eslint-disable */
import {WebClient, ChatPostMessageResponse, KnownBlock, Block, UsersListResponse, View} from '@slack/web-api';
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
            const user = await this.getUserInfo({email: target.email});
            if (user && user.id) {
                return user.id;
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
     * 특정 사용자 정보 단건 조회 (API 낭비 방지)
     * 이메일 또는 슬랙 고유 ID를 기반으로 해당 유저의 상세 정보만 초고속으로 가져옵니다.
     */
    public async getUserInfo(target: {slackId?: string; email?: string}): Promise<SlackMember | null> {
        try {
            // 1. 슬랙 ID가 주어졌을 때
            if (target.slackId) {
                const result = await this.client.users.info({user: target.slackId});
                if (result.ok && result.user) {
                    return result.user as SlackMember;
                }
            }

            // 2. 이메일이 주어졌을 때
            if (target.email) {
                const result = await this.client.users.lookupByEmail({email: target.email});
                if (result.ok && result.user) {
                    return result.user as SlackMember;
                }
            }

            return null;
        } catch (error: any) {
            console.warn(`[Slack] 단건 사용자 조회 실패 (대상: ${JSON.stringify(target)}):`, error.message);
            return null;
        }
    }

    /**
     * 슬랙 ID를 기반으로 해당 유저의 표시 이름(Display Name)을 최우선으로 추출해 반환합니다.
     */
    public async getDisplayName(slackUserId: string, fallbackName: string = '관리자'): Promise<string> {
        if (!slackUserId) return fallbackName;
        const userInfo = await this.getUserInfo({slackId: slackUserId});
        return userInfo?.profile?.display_name || userInfo?.profile?.real_name || fallbackName;
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

    /**
     * 병렬 메시지 전송
     */
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

    /**
     * 모달창 오픈
     */
    public async openModal(triggerId: string, view: View): Promise<void> {
        try {
            const response = await this.client.views.open({
                trigger_id: triggerId,
                view: view
            });
            
            if (!response.ok) {
                console.error('[Slack Modal Error] 모달 오픈 실패:', response.error);
            }
        } catch (error: any) {
            throw new Error(`[Slack Modal Error] ${error.message}`);
        }
    }
}
