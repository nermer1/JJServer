import webPush from 'web-push';
import logger from '../utils/logger.js';
import {externalProperty, basicProperty} from '../properties/ServerProperty.js';

class WebPushService {
    private pushSubscriptions = new Map<string, any>();
    private VAPID_PUBLIC_KEY = externalProperty.getString('VAPID_PUBLIC_KEY');
    private VAPID_PRIVATE_KEY = externalProperty.getString('VAPID_PRIVATE_KEY');

    public init() {
        if (this.VAPID_PUBLIC_KEY && this.VAPID_PRIVATE_KEY) {
            webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:unipost.web@gmail.co.kr', this.VAPID_PUBLIC_KEY, this.VAPID_PRIVATE_KEY);
            logger.info('[push] VAPID 키 로드 완료');
        } else {
            logger.warn('[push] VAPID 키 미설정 → Web Push 비활성화');
        }
    }

    public getVapidPublicKey() {
        return this.VAPID_PUBLIC_KEY || null;
    }

    public subscribePush(hostname: string, subscription: any) {
        this.pushSubscriptions.set(hostname, subscription);
        logger.info(`[push] 구독 등록: ${hostname} (총 ${this.pushSubscriptions.size}건)`);
    }

    public async sendNotification(hostname: string, payload: string) {
        const targetSub = this.pushSubscriptions.get(hostname);
        if (targetSub && this.VAPID_PUBLIC_KEY) {
            try {
                logger.info(`[push] 전송 시도: ${hostname}`);
                await webPush.sendNotification(targetSub, payload, {TTL: 30});
            } catch (err: any) {
                logger.warn(`[push] 전송 실패 (${hostname}): ${err.message}`);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    this.pushSubscriptions.delete(hostname);
                }
            }
        }
    }
}

export default new WebPushService();

