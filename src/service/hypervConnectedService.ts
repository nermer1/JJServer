import {Socket} from 'socket.io';
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
        await setCompanyInfo(data);
        socket.to('hyperv-session').emit('sessionData', service.getHypervStatus());
    }
};

// 기존 xml
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

// 임시 캐시화
let hostData: ObjType = {};

async function getHostnameToUserName(key: string) {
    if (Object.keys(hostData).length > 0) return hostData[key.toLowerCase()] || key;
    hostData = (await schemas.userHost.getUserHost()).reduce((a: ObjType, b: any) => {
        a[b.USER_HOST] = b.USER_NAME;
        return a;
    }, {});

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
