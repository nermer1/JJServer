import {exec} from 'child_process';
import {promisify} from 'util';
import logger from '../utils/logger.js';
import {Server} from 'socket.io';
import {schemas} from '../schemas/schemaMap.js';
import redisTest from '../db/RedisTest.js';
import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import {SlackMessenger} from '../messenger/slack/SlackMessenger.js';
import {RemoteRequestBlocks} from './slack/blocks/RemoteRequestBlocks.js';
import {OtpRequestBlocks} from './slack/blocks/OtpRequestBlocks.js';

const execAsync = promisify(exec);

class HypervSocketService {
    private _slackClient: SlackMessenger | null = null;
    private hostData: ObjType = {};

    private get slackClient() {
        if (!this._slackClient) {
            this._slackClient = new SlackMessenger(SystemSettingsCacheService.getRequired('SLACK_TOKEN'));
        }
        return this._slackClient;
    }

    public reloadClient() {
        this._slackClient = null;
        logger.info('[HyperV] 슬랙 봇 클라이언트 캐시가 비워졌습니다. (다음 호출 시 재초기화)');
    }

    public clearHostDataCache() {
        this.hostData = {};
        this.userMap.clear();
        logger.info('[HyperV] 유저/호스트 데이터 메모리 캐시가 비워졌습니다.');
    }

    private userMap = new Map<string, string>();
    private isDirty = false;
    private io: Server | null = null;

    private vmWaitlist = new Map<string, {requesterName: string; requesterHostname: string}[]>();
    private otpWaitlist = new Map<string, {requesterName: string; requesterHostname: string}[]>();
    private handoverMap = new Map<string, number>();

    public getIo(): Server | null {
        return this.io;
    }

    public init(io: Server) {
        this.io = io;

        setInterval(async () => {
            if (!this.isDirty || !this.io) return;
            this.isDirty = false;
            try {
                const status = await this.computeVmStatus();
                this.io.emit('vm-status-update', status);

                const otpStatus = await this.computeOtpStatus();
                this.io.emit('otp-status-update', otpStatus);

                // VM 대기열 확인 및 알림
                const activeVmNames = new Set(status.map((v) => v.vmName));
                const now = Date.now();

                for (const [vmName, waiters] of this.vmWaitlist.entries()) {
                    if (waiters.length > 0 && !activeVmNames.has(vmName)) {
                        const handoverTime = this.handoverMap.get(vmName);
                        if (handoverTime && now - handoverTime < 15000) {
                            // 15초 이내에 양도가 발생했다면, 새 주인의 VM이 켜지는 중이므로 알림 생략
                            continue;
                        }
                        await this.notifyWaiters(vmName, waiters, 'VM');
                        this.vmWaitlist.delete(vmName);
                        this.handoverMap.delete(vmName);
                    }
                }

                // OTP 대기열 확인 및 알림
                const activePhoneNames = new Set(otpStatus.map((v) => v.phoneName));
                for (const [phoneName, waiters] of this.otpWaitlist.entries()) {
                    if (waiters.length > 0 && !activePhoneNames.has(phoneName)) {
                        const handoverTime = this.handoverMap.get(phoneName);
                        if (handoverTime && now - handoverTime < 15000) {
                            continue;
                        }
                        await this.notifyWaiters(phoneName, waiters, 'OTP');
                        this.otpWaitlist.delete(phoneName);
                        this.handoverMap.delete(phoneName);
                    }
                }
            } catch (error) {
                logger.error(`Status broadcast error: ${error}`);
            }
        }, 1000);

        let previousAgentCount = 0;
        setInterval(async () => {
            try {
                const keys = await redisTest.keys('agent:*');
                if (keys.length !== previousAgentCount) {
                    logger.info(`[stale] 갱신 또는 상태 변동 감지 (이전: ${previousAgentCount}, 현재: ${keys.length})`);
                    this.isDirty = true;
                    previousAgentCount = keys.length;
                }
            } catch (err) {
                logger.error(`Redis keys check error: ${err}`);
            }
        }, 5000);
    }

    private async notifyWaiters(targetName: string, waiters: {requesterName: string; requesterHostname: string}[], type: 'VM' | 'OTP') {
        for (const waiter of waiters) {
            try {
                if (!waiter.requesterHostname) continue;
                const targetUser = await schemas.users.model.findOne({hostname: waiter.requesterHostname}).select('slackId').lean();
                if (targetUser && targetUser.slackId) {
                    const message =
                        type === 'VM'
                            ? `*${targetName}* VM의 사용이 종료되었습니다. 지금 바로 접속 가능합니다!`
                            : `*${targetName}* 폰의 사용이 종료되었습니다. 지금 바로 접속 가능합니다!`;

                    const payloadValue = JSON.stringify({
                        targetName,
                        type,
                        requesterHostname: waiter.requesterHostname,
                        requesterName: waiter.requesterName
                    });

                    await this.slackClient.sendCardMessage({
                        channelId: targetUser.slackId,
                        message: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: message
                                }
                            },
                            {
                                type: 'actions',
                                elements: [
                                    {
                                        type: 'button',
                                        text: {
                                            type: 'plain_text',
                                            text: '접속하기',
                                            emoji: true
                                        },
                                        value: payloadValue,
                                        action_id: 'waitlist_connect_request',
                                        style: 'primary'
                                    }
                                ]
                            }
                        ]
                    });
                }
            } catch (err) {
                logger.error(`[Slack Notify Error] Failed to send waitlist notification for ${targetName}: ${err}`);
            }
        }
    }

    private async getHostnameToUserName(key: string): Promise<string> {
        if (Object.keys(this.hostData).length > 0) return this.hostData[key] || key;

        const hosts = await schemas.users.model
            .find({
                hostname: {$exists: true, $ne: ''}
            })
            .select('hostname name');
        this.hostData = hosts.reduce((a: ObjType, b: any) => {
            a[b.hostname] = b.name;
            return a;
        }, {});

        return this.hostData[key] || key;
    }

    public async computeVmStatus() {
        const keys = await redisTest.keys('agent:*');
        const agentDataList = [];

        for (const key of keys) {
            const dataStr = await redisTest.get(key);
            if (dataStr) {
                agentDataList.push({hostname: key.replace('agent:', ''), ...JSON.parse(dataStr)});
            }
        }

        const vmUsageMap = new Map<string, {hostname: string; userName: string}>();
        for (const data of agentDataList) {
            const activeVMs = data.activeVMs || [];
            for (const vmName of activeVMs) {
                vmUsageMap.set(vmName, {hostname: data.hostname, userName: await this.getHostnameToUserName(data.hostname)});
            }
        }

        return Array.from(vmUsageMap.entries()).map(([vmName, usage]) => ({
            vmName,
            isConnected: !!usage,
            hostname: usage.hostname,
            userName: usage.userName
        }));
    }

    public async computeOtpStatus() {
        const keys = await redisTest.keys('agent:*');
        const agentDataList = [];

        for (const key of keys) {
            const dataStr = await redisTest.get(key);
            if (dataStr) {
                agentDataList.push({hostname: key.replace('agent:', ''), ...JSON.parse(dataStr)});
            }
        }

        const otpUsageMap = new Map<string, {hostname: string; userName: string}>();
        for (const data of agentDataList) {
            const activePhones = data.activePhones || [];
            for (const phoneName of activePhones) {
                otpUsageMap.set(phoneName, {hostname: data.hostname, userName: await this.getHostnameToUserName(data.hostname)});
            }
        }

        return Array.from(otpUsageMap.entries()).map(([phoneName, usage]) => ({
            phoneName,
            isConnected: !!usage,
            hostname: usage.hostname,
            userName: usage.userName
        }));
    }

    public async handleHeartbeat(hostname: string, activeVMs: string[], activePhones: string[] = []) {
        const resolvedName = this.userMap.get(hostname) ?? hostname;
        const data = {
            userName: resolvedName,
            activeVMs: Array.isArray(activeVMs) ? activeVMs : [],
            activePhones: Array.isArray(activePhones) ? activePhones : []
        };

        await redisTest.set(`agent:${hostname}`, JSON.stringify(data), {EX: 10});
        this.isDirty = true;
    }

    public async requestVm(vmName: string, requesterName: string, requesterHostname?: string) {
        const vmStatus = await this.computeVmStatus();
        const vm = vmStatus.find((v) => v.vmName === vmName);

        if (!vm?.hostname) {
            return {ok: false, message: '현재 사용 중인 사람이 없습니다.'};
        }

        if (requesterHostname) {
            const waiters = this.vmWaitlist.get(vmName) || [];
            if (!waiters.find((w) => w.requesterHostname === requesterHostname)) {
                waiters.push({requesterName, requesterHostname});
                this.vmWaitlist.set(vmName, waiters);
            }
        }

        if (this.io) {
            logger.info(`[use-request] ${vmName}, ${requesterName}, ${requesterHostname}`);

            // Debugging rooms
            const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
            logger.info(`[debug] Active rooms: ${rooms.join(', ')}`);
            logger.info(`[debug] Does room '${vm.hostname}' exist? ${rooms.includes(vm.hostname)}`);

            this.io.to(vm.hostname).emit('use-request', {vmName, requesterName, requesterHostname: requesterHostname ?? null});
        }

        /* const payload = JSON.stringify({
            title: 'VM 접속 요청',
            body: `${requesterName}님이 ${vmName} 접속을 요청했습니다.`,
            tag: `vm-request-${vmName}`,
            vmName,
            requesterName,
            requesterHostname: requesterHostname ?? null,
            sentAt: Date.now()
        });

        await WebPushService.sendNotification(vm.hostname, payload); */

        // Slack Notification
        try {
            const targetUser = await schemas.users.model.findOne({hostname: vm.hostname}).select('slackId').lean();
            if (targetUser && targetUser.slackId) {
                const requestInfo = {
                    requester: requesterName,
                    targetHostname: vm.hostname, // VM이 떠 있는 호스트
                    requesterHostname: requesterHostname, // 접속을 요청한 사람의 호스트
                    vmName: vmName,
                    reason: `${vmName} 원격 접속 요청`
                };
                const blocks = RemoteRequestBlocks.buildRequestBlocks(requestInfo);
                await this.slackClient.sendCardMessage({
                    channelId: targetUser.slackId,
                    message: blocks
                });
                logger.info(`[slack-message-sent] Slack message sent to ${vm.hostname} (Slack ID: ${targetUser.slackId})`);
            } else {
                logger.warn(`[slack-message-failed] Cannot find slackId for hostname: ${vm.hostname}`);
            }
        } catch (error) {
            logger.error(`[Slack Notify Error] Failed to send remote request message: ${error}`);
        }

        return {ok: true};
    }

    public async requestOtp(phoneName: string, requesterName: string, requesterHostname?: string) {
        const otpStatus = await this.computeOtpStatus();
        const phone = otpStatus.find((v) => v.phoneName === phoneName);

        if (!phone?.hostname) {
            return {ok: false, message: '현재 사용 중인 사람이 없습니다.'};
        }

        if (requesterHostname) {
            const waiters = this.otpWaitlist.get(phoneName) || [];
            if (!waiters.find((w) => w.requesterHostname === requesterHostname)) {
                waiters.push({requesterName, requesterHostname});
                this.otpWaitlist.set(phoneName, waiters);
            }
        }

        if (this.io) {
            logger.info(`[otp-use-request] ${phoneName}, ${requesterName}, ${requesterHostname}`);
        }

        // Slack Notification
        try {
            const targetUser = await schemas.users.model.findOne({hostname: phone.hostname}).select('slackId').lean();
            if (targetUser && targetUser.slackId) {
                const requestInfo = {
                    requester: requesterName,
                    targetHostname: phone.hostname, // 폰이 떠 있는 호스트
                    requesterHostname: requesterHostname, // 접속을 요청한 사람의 호스트
                    phoneName: phoneName,
                    reason: `${phoneName} 사용 점유 요청`
                };
                const blocks = OtpRequestBlocks.buildRequestBlocks(requestInfo);
                await this.slackClient.sendCardMessage({
                    channelId: targetUser.slackId,
                    message: blocks
                });
                logger.info(`[slack-message-sent] Slack message sent to ${phone.hostname} (Slack ID: ${targetUser.slackId})`);
            } else {
                logger.warn(`[slack-message-failed] Cannot find slackId for hostname: ${phone.hostname}`);
            }
        } catch (error) {
            logger.error(`[Slack Notify Error] Failed to send otp request message: ${error}`);
        }

        return {ok: true};
    }

    public markAsAccepted(targetName: string, requesterHostname: string, type: 'VM' | 'OTP') {
        const waitlist = type === 'VM' ? this.vmWaitlist : this.otpWaitlist;

        // 승인받은 특정인만 대기열에서 제거
        const waiters = waitlist.get(targetName);
        if (waiters) {
            const updated = waiters.filter((w) => w.requesterHostname !== requesterHostname);
            if (updated.length > 0) {
                waitlist.set(targetName, updated);
            } else {
                waitlist.delete(targetName);
            }
        }
        // 양도 유예(핸드오버) 시간 15초 설정
        this.handoverMap.set(targetName, Date.now());
        logger.info(`[waitlist] ${targetName} 핸드오버 타이머 시작, 승인자: ${requesterHostname}`);
    }

    public requestResponse(vmName: string, accepted: boolean, requesterHostname?: string) {
        logger.info('requesterHostname', requesterHostname);
        logger.info('this.io is initialized:', !!this.io);

        if (accepted && requesterHostname) {
            // 승인받은 특정인만 대기열에서 제거
            const waiters = this.vmWaitlist.get(vmName);
            if (waiters) {
                const updated = waiters.filter((w) => w.requesterHostname !== requesterHostname);
                if (updated.length > 0) {
                    this.vmWaitlist.set(vmName, updated);
                } else {
                    this.vmWaitlist.delete(vmName);
                }
            }
            // 양도 유예(핸드오버) 시간 15초 설정 (기존 점유자가 꺼지고 새 주인이 켜는 동안 오알림 방지)
            this.handoverMap.set(vmName, Date.now());
        }

        if (requesterHostname && this.io) {
            this.io.to(requesterHostname).emit('request-result', {vmName, accepted});
            logger.info(`[request-response] ${vmName} → ${accepted ? '수락' : '거절'} → ${requesterHostname}`);
        }
    }
}

export default new HypervSocketService();
