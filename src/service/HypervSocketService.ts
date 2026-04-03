import {exec} from 'child_process';
import {promisify} from 'util';
import logger from '../utils/logger.js';
import {Server} from 'socket.io';
import WebPushService from './WebPushService.js';
import {schemas} from '../schemas/schemaMap.js';
import redisTest from '../db/RedisTest.js';

const execAsync = promisify(exec);

class HypervSocketService {
    private hostData: ObjType = {};

    private userMap = new Map<string, string>();
    private isDirty = false;
    private io: Server | null = null;

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

    private async getHostnameToUserName(key: string): Promise<string> {
        if (Object.keys(this.hostData).length > 0) return this.hostData[key.toLowerCase()] || key;

        const hosts = await schemas.users.model
            .find({
                hostname: {$exists: true, $ne: ''}
            })
            .select('hostname name');
        this.hostData = hosts.reduce((a: ObjType, b: any) => {
            a[b.hostname] = b.name;
            return a;
        }, {});

        return this.hostData[key.toLowerCase()] || key;
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
            for (const vmName of data.activeVMs) {
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

    public async handleHeartbeat(hostname: string, activeVMs: string[]) {
        const resolvedName = this.userMap.get(hostname) ?? hostname;
        const data = {
            userName: resolvedName,
            activeVMs: Array.isArray(activeVMs) ? activeVMs : []
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

        if (this.io) {
            logger.info(`[use-request] ${vmName}, ${requesterName}, ${requesterHostname}`);

            // Debugging rooms
            const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
            logger.info(`[debug] Active rooms: ${rooms.join(', ')}`);
            logger.info(`[debug] Does room '${vm.hostname}' exist? ${rooms.includes(vm.hostname)}`);

            this.io.to(vm.hostname).emit('use-request', {vmName, requesterName, requesterHostname: requesterHostname ?? null});
        }

        const payload = JSON.stringify({
            title: 'VM 접속 요청',
            body: `${requesterName}님이 ${vmName} 접속을 요청했습니다.`,
            tag: `vm-request-${vmName}`,
            vmName,
            requesterName,
            requesterHostname: requesterHostname ?? null,
            sentAt: Date.now()
        });

        await WebPushService.sendNotification(vm.hostname, payload);

        return {ok: true};
    }

    public requestResponse(vmName: string, accepted: boolean, requesterHostname?: string) {
        logger.info('requesterHostname', requesterHostname);
        logger.info('this.io is initialized:', !!this.io);
        if (requesterHostname && this.io) {
            this.io.to(requesterHostname).emit('request-result', {vmName, accepted});
            logger.info(`[request-response] ${vmName} → ${accepted ? '수락' : '거절'} → ${requesterHostname}`);
        }
    }
}

export default new HypervSocketService();

