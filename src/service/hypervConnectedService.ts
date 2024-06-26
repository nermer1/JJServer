import {Request, Response, NextFunction} from 'express';
import {Socket} from 'socket.io';
import {schemas} from '../schemas/schemaMap.js';

class HypervConnectedService {
    private companycomputer: Tt = {};
    private hostData: ObjType = {};
    private sseClients: Response[] = [];

    public getHypervStatus(): Array<Ttt> {
        return Object.keys(this.companycomputer).reduce((arr: Array<Ttt>, key, idx) => {
            const item = this.companycomputer[key];
            item.id = idx;
            arr.push(item);
            return arr;
        }, []);
    }

    public async getHyperVUpdate(data: ObjType): Promise<void> {
        await this.setCompanyInfo(data);

        this.sseClients.forEach((client) => {
            client.write('sessionData:' + JSON.stringify(this.getHypervStatus()));
        });
    }

    public test(res: Response): void {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // 클라이언트를 SSE 클라이언트 목록에 추가
        this.sseClients.push(res);
    }

    /* public async getHyperVUpdate(socket: Socket, data: ObjType): Promise<void> {
        await this.setCompanyInfo(data);
        socket.to('hyperv-session').emit('sessionData', this.getHypervStatus());
    } */

    private async getHostnameToUserName(key: string): Promise<string> {
        if (Object.keys(this.hostData).length > 0) return this.hostData[key.toLowerCase()] || key;
        this.hostData = (await schemas.userHost.getUserHost()).reduce((a: ObjType, b: any) => {
            a[b.USER_HOST] = b.USER_NAME;
            return a;
        }, {});

        return this.hostData[key.toLowerCase()] || key;
    }

    private async setCompanyInfo(data: ObjType): Promise<void> {
        const template = {
            customer: '',
            hostName: '',
            isConnect: false,
            clientHostName: '',
            currentTime: ''
        };
        if (!data) return;

        template.hostName = data.hostName || template.hostName;
        template.customer = template.hostName.replace(/local-(.*)/, '$1');
        template.isConnect = data.type === 'on';
        template.clientHostName = data.type === 'on' ? await this.getHostnameToUserName(data.clientHostName) : '';
        template.currentTime = data.currentTime;
        if (data.hostName) this.companycomputer[data.hostName] = template;
    }
}

export default new HypervConnectedService();
