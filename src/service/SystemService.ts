import {schemas} from '../schemas/schemaMap.js';

class SystemService {
    public async getCombinedIpData(hasDetailPermission: boolean) {
        // 1. users의 ips 배열과 customerEtc의 pc 배열을 DB에서 가져옴
        const customerEtcList = (await schemas.customerEtc.model.find({}, {pc: 1, _id: 0}).lean()) as any[];
        const usersList = (await schemas.users.model.find({}, {ips: 1, _id: 0}).lean()) as any[];

        let combinedList: any[] = [];

        if (hasDetailPermission) {
            // 권한이 있는 경우: 상세 정보(mac, hostname, type 등) 포함하여 가공
            const pcList = customerEtcList.flatMap((c) =>
                (c.pc || []).map((p: any) => ({
                    source: 'customerEtc',
                    ip: p.ip,
                    type: p.type,
                    hostname: p.hostname,
                    mac: p.mac,
                    hostServerIP: p.hostServerIP,
                    vmName: p.vmName
                }))
            );

            // users 콜렉션의 ip는 'ips' 필드 배열 안에 'address' 로 저장되어 있음
            const userIpsList = usersList.flatMap((u) =>
                (u.ips || []).map((i: any) => ({
                    source: 'users',
                    ip: i.address,
                    type: i.type,
                    name: i.name
                }))
            );

            combinedList = [...pcList, ...userIpsList];
        } else {
            // 권한이 없는 경우: 오직 ip 필드만 추출하여 평탄화
            const pcIps = customerEtcList.flatMap((c) => (c.pc || []).map((p: any) => p.ip).filter(Boolean));
            const userIps = usersList.flatMap((u) => (u.ips || []).map((i: any) => i.address).filter(Boolean));

            // Set을 이용하여 중복 IP 제거
            const uniqueIps = Array.from(new Set([...pcIps, ...userIps]));
            combinedList = uniqueIps.map((ip) => ({ip}));
        }

        return combinedList;
    }
}

export default new SystemService();

