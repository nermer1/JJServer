import jjUtil from '../utils/JJUtils.js';
import {createRequire} from 'module';
import JJMail from '../mail/sendMail.js';
import {basicProperty} from '../properties/ServerProperty.js';
import {axiosCall} from '../modules/httpClient/httpClient.js';
import {webdriver} from '../selenium/driver.js';
const require = createRequire(import.meta.url);
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

let isTest = true;
let isWeb = true;
let isSendMail = true;

const run = async () => {
    const driver = await webdriver('https://114.unipost.co.kr:8543');
    try {
        await driver.wait(until.elementLocated(By.id('login-id')), 10000).sendKeys(basicProperty.selenium.support.user);
        await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys(basicProperty.selenium.support.password);
        await driver.wait(until.elementLocated(By.className('btn_login fid-loginBtn')), 10000).click();

        const cookies = await driver.manage().getCookies();

        axiosCall(
            'https://114.unipost.co.kr:8543/admin/request/getLaborInputData.do',
            {
                headers: {
                    Cookie: cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
                },
                data: {
                    endDate: '2023-11-18',
                    group_S: 'S',
                    group_W: 'W',
                    searchDateType: 'P',
                    searchType: 'processor',
                    startDate: '2023-11-12'
                }
            },
            (data: any) => {
                const originalDataArray = Object.values(
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

                console.log('메일 발송! ', originalDataArray);
                /* if (isSendMail)
                    JJMail.sendMailWithMustache(
                        '유니포스트 구독팀 <permes@unipost.co.kr>',
                        'permes@unipost.co.kr',
                        '[유니포스트] 공수 시간 확인',
                        'inputTimeSupportTemplate',
                        {TEST: arr}
                    ); */
            }
        );
    } catch (e) {
        console.error(e);
    } finally {
        driver.quit();
    }
};

export default run;
