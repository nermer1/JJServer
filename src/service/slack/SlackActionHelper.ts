import {apiClient} from '../../modules/httpClient/ApiClient.js';
import {dateUtil} from '../../utils/Utils.js';

export class SlackActionHelper {
    /**
     * 슬랙 액션(버튼 등)의 유효시간(초)이 지났는지 검사하고,
     * 만료된 경우 사용자에게 만료 안내 메시지를 전송합니다.
     *
     * @param payload 슬랙 인터랙션 payload
     * @param responseUrl 메시지를 응답할 Slack Response URL
     * @param expireSeconds 만료 시간 (기본값: 60초)
     * @returns 만료되었으면 true, 아니면 false
     */
    static async isActionExpired(payload: any, responseUrl: string, expireSeconds: number = 60): Promise<boolean> {
        const messageTs = payload.message?.ts || payload.container?.message_ts;
        if (!messageTs) {
            return false;
        }

        if (dateUtil.isUnixSecondsExpired(messageTs, expireSeconds)) {
            await apiClient.post(responseUrl, {
                replace_original: true,
                text: `유효시간(${expireSeconds}초)이 지나 만료된 요청입니다.`,
                response_type: 'ephemeral'
            });
            return true;
        }

        return false;
    }
}

