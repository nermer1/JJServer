import {jjUtil} from '../utils/JJUtils.js';
import {basicProperty} from '../properties/ServerProperty.js';
import {axiosCall} from '../modules/httpClient/httpClient.js';
import {webdriver, sendMail, Key, By, until} from './subscriptionGroupManager.js';

const isWeb = true;
const isTest = true;

function getParams() {
    const date = {
        from: jjUtil.dateUtil.formatDate(jjUtil.dateUtil.getMondayOfCurrentWeek(), 'yyyy-MM-dd'),
        to: jjUtil.dateUtil.formatDate(new Date(), 'yyyy-MM-dd')
    };

    return {
        mail: {
            send: '유니포스트 구독팀 <permes@unipost.co.kr>',
            receiver: isTest ? 'permes@unipost.co.kr' : 'webhelp@unipost.co.kr',
            subject: '[유니포스트] 구독팀 금주의 공수 시간 확인',
            mustache: 'inputTimeSupportTemplate',
            data: {
                DATE: `${date.from} ~ ${date.to}`,
                INFO_DATA: []
            }
        },
        driver: {
            front: {
                url: 'https://114.unipost.co.kr:8543',
                id: basicProperty.selenium.support.user,
                pass: basicProperty.selenium.support.password
            },
            end: {
                url: 'https://114.unipost.co.kr:8543/admin/request/getLaborInputData.do',
                data: {
                    endDate: date.to,
                    group_S: 'S',
                    group_W: 'W',
                    searchDateType: 'P',
                    searchType: 'processor',
                    startDate: date.from
                }
            }
        }
    };
}

const run = async () => {
    const params: UnipostSelelniumParams = getParams();
    const driver = await webdriver(params.driver.front.url);

    try {
        await driver.wait(until.elementLocated(By.id('login-id')), 10000).sendKeys(params.driver.front.id);
        await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys(params.driver.front.pass);
        await driver.wait(until.elementLocated(By.className('btn_login fid-loginBtn')), 10000).click();

        const cookies = await driver.manage().getCookies();

        axiosCall(
            params.driver.end.url,
            {
                headers: {
                    Cookie: cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
                },
                data: params.driver.end.data
            },
            (data: any) => {
                params.mail.data.INFO_DATA = Object.values(
                    data.response
                        .filter((item: any) => {
                            if (item['SRP_POS'] === (isWeb ? 'W' : 'S')) return item;
                        })
                        .reduce((obj: any, item: any) => {
                            obj[item['MEM_NAME']] = obj[item['MEM_NAME']] || {ALL_SUM_MH: 0, ALL_SUM_MD: 0, MEM_NAME: item['MEM_NAME']};
                            obj[item['MEM_NAME']]['ALL_SUM_MH'] += item['ALL_SUM_MH'];
                            obj[item['MEM_NAME']]['ALL_SUM_MD'] += item['ALL_SUM_MD'];
                            return obj;
                        }, {})
                ).map((item: any) => {
                    // 40 주 5일 하루 8시간 기준, 5  주 5일
                    // 추후 달력 내 휴일 같이 계산 하게 변경되어야함
                    item['ALL_SUM_MH'] = Number(item['ALL_SUM_MH'].toFixed(2));
                    item['ALL_SUM_MD'] = Number(item['ALL_SUM_MD'].toFixed(2));
                    item['NEED_SUM_MH'] = (40 - item['ALL_SUM_MH']).toFixed(2);
                    item['NEED_SUM_MD'] = (5 - item['ALL_SUM_MD']).toFixed(2);
                    return item;
                });
                if (params.mail.data.INFO_DATA.length === 0) params.mail.data['IS_EMPTY'] = true;
                sendMail(params.mail);
            }
        );
    } catch (e) {
        console.error(e);
    } finally {
        driver.quit();
    }
};

export default run;
