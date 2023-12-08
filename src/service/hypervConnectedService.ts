import {Request, Response, NextFunction} from 'express';
import fs from 'fs';
import {Server} from 'http';
import {Socket} from 'socket.io';
import parser from 'xml-js';
import {schemas} from '../schemas/schemaMap.js';

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
    getHyperVUpdate: async (socket: Socket, data: ObjType) => {
        console.log(data);
        await setCompanyInfo(data);
        console.log('teat', service.getHypervStatus());
        socket.to('hyperv-session').emit('sessionData', service.getHypervStatus());
    }
};

/* function getHostnameToUserName(key: string) {
    const hostMap = {} as ObjType;
    var xml = fs.readFileSync('./xml/test.xml', {encoding: 'utf-8'});
    var result = parser.xml2json(xml, {compact: true});
    // todo any, objtype 변경
    JSON.parse(result)['user']['hostname'].reduce((a: ObjType, b: any) => {
        a[b.key._text] = b.value._text;
        return a;
    }, hostMap);
    return hostMap[key.toLowerCase()] || key;
} */

let hostData: ObjType = {};

async function getHostnameToUserName(key: string) {
    if (Object.keys(hostData).length > 0) return hostData[key.toLowerCase()] || key;

    const userHost = schemas.userHost.model;
    //const users = schemas.users.model;
    const data = await userHost.aggregate([
        {
            $lookup: {
                from: 'users', // 조인할 컬렉션명
                localField: 'USER_ID',
                foreignField: 'USER_ID',
                as: 'user_info'
            }
        },
        {
            $unwind: '$user_info' // 배열을 풀어줌
        },
        {
            $project: {
                USER_HOST: 1,
                USER_NAME: '$user_info.USER_NAME' // users 컬렉션에서 가져온 nickname 필드
            }
        }
    ]);

    hostData = data.reduce((a: ObjType, b: any) => {
        a[b.USER_HOST] = b.USER_NAME;
        return a;
    }, {});

    console.log('hostData', hostData);
    return hostData[key.toLowerCase()] || key;
}

async function setCompanyInfo(data: ObjType) {
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
    template.clientHostName = data.type === 'on' ? await getHostnameToUserName(data.clientHostName) : '';
    template.currentTime = data.currentTime;
    if (data.hostName) companycomputer[data.hostName] = template;
}

export default service;
