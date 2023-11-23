import {Request, Response, NextFunction} from 'express';
import fs from 'fs';
import {Server} from 'http';
import {Socket} from 'socket.io';
import parser from 'xml-js';

const companycomputer: Tt = {};
const service = {
    getHypervStatus: () => {
        return Object.keys(companycomputer).reduce((arr: Array<Ttt>, key, idx) => {
            const item = companycomputer[key];
            item.id = idx;
            arr.push(item);
            return arr;
        }, []);
    },
    getHyperVUpdate: (socket: Socket, data: ObjType) => {
        setCompanyInfo(data);
        socket.to('hyperv-session').emit('sessionData', service.getHypervStatus());
    }
};

function getHostnameToUserName(key: string) {
    const hostMap = {} as ObjType;
    var xml = fs.readFileSync('./xml/test.xml', {encoding: 'utf-8'});
    var result = parser.xml2json(xml, {compact: true});
    // todo any, objtype 변경
    JSON.parse(result)['user']['hostname'].reduce((a: ObjType, b: any) => {
        a[b.key._text] = b.value._text;
        return a;
    }, hostMap);
    return hostMap[key.toLowerCase()] || key;
}

function setCompanyInfo(data: ObjType) {
    const template = {
        customer: '',
        hostName: '',
        isConnect: false,
        clientHostName: '',
        currentTime: ''
    };
    if (!data) return;

    template.hostName = data.hostName || template.hostName;
    template.customer = data.hostName.replace(/local-(.*)/, '$1');
    template.isConnect = data.type === 'on';
    template.clientHostName = data.type === 'on' ? getHostnameToUserName(data.clientHostName) : '';
    template.currentTime = data.currentTime;
    if (data.hostName) companycomputer[data.hostName] = template;
}

export default service;
