import jjUtil from '../utils/JJUtils.js';
import {createRequire} from 'module';
import JJMail from '../mail/sendMail.js';
import {basicProperty} from '../properties/ServerProperty.js';
import {axiosCall} from '../modules/httpClient/httpClient.js';
import {webdriver} from '../selenium/driver.js';
const require = createRequire(import.meta.url);
const {By, until} = require('selenium-webdriver');

let isTest = true;
let isWeb = true;
let isSendMail = true;

function aaaaa(date1: Date) {
    const lastDate = new Date(date1);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);

    const a = jjUtil.dateUtil.formatDate(lastDate);
    const b = jjUtil.dateUtil.formatDate(fourteenDaysAgo);
    return a.localeCompare(b);
}

const run = async () => {
    const driver = await webdriver('https://114.unipost.co.kr:8543');

    try {
        await driver.wait(until.elementLocated(By.id('login-id')), 10000).sendKeys(basicProperty.selenium.support.user);
        await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys(basicProperty.selenium.support.password);
        await driver.wait(until.elementLocated(By.className('btn_login fid-loginBtn')), 10000).click();

        const cookies = await driver.manage().getCookies();

        axiosCall(
            'https://114.unipost.co.kr:8543/admin/request/requestSearch.do',
            {
                headers: {
                    Cookie: cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
                },
                data: {
                    searchDateType: 'R',
                    startDate: '2023-10-01',
                    endDate: '2023-11-03',
                    cmIdx: '',
                    memIdx: 1423,
                    memDiv: 'U',
                    loginDataOnly: 'N',
                    customerName: 'A',
                    customerNameText: '',
                    customerNameExcept: false,
                    receiptInfo: 'A',
                    receiptInfoText: '',
                    requestInfo: 'A',
                    requestInfoText: '',
                    unidocuPart: 'Z',
                    processSalesStatus: 'Z',
                    processKindAll: 'Z',
                    processKind_A: 'A',
                    processKind_B: 'B',
                    processKind_C: 'C',
                    processKind_D: 'D',
                    processKind_E: 'E',
                    // 처리상태
                    progression_R: 'R', // 확인요청
                    progression_E: 'E', // 테스트 요청
                    progression_C: 'C',
                    progression_N: 'N'
                }
            },
            (data: any) => {
                const originalDataArray = data.response
                    .filter((item: any) => {
                        return (
                            aaaaa(item['PROCESS_DATE']) !== 1 &&
                            item['WRITER_ALL'].split(',').reduce((bool: boolean, writer: string) => {
                                bool = isWeb
                                    ? '오충환,김재현,장정호,김승규,강민승,이호인,김동혁'.includes(writer)
                                    : '김소라,공소정,김지원,최지은,박재영,정홍희,박재성,이연우,이루리,박중현,김나영,오세민'.includes(writer);
                                return bool;
                            }, false)
                        );
                    })
                    .map((item: any) => {
                        delete item['REQ_TXT'];
                        delete item['PROCESS_TXT'];
                        switch (item['STATUS_CODE']) {
                            case 'R':
                                item['STATUS_CODE'] = '확인요청';
                                break;
                            case 'E':
                                item['STATUS_CODE'] = '테스트요청';
                                break;
                            case 'O':
                                item['STATUS_CODE'] = '운영반영요청';
                                break;
                            case 'I':
                                item['STATUS_CODE'] = '완료';
                                break;
                            case 'W':
                                item['STATUS_CODE'] = '보류';
                                break;
                            case 'C':
                                item['STATUS_CODE'] = '처리중';
                                break;
                            case 'M':
                                item['STATUS_CODE'] = '검토';
                                break;
                            case 'N':
                                item['STATUS_CODE'] = '고객사답변';
                                break;
                        }
                        return item;
                    });

                if (isSendMail) {
                    console.log('메일 발송! ', originalDataArray);
                    /* JJMail.sendMailWithMustache(
                        '유니포스트 구독팀 <permes@unipost.co.kr>',
                        'permes@unipost.co.kr',
                        '[유니포스트] 서포트 미처리 내역 확인',
                        'remainingSupportTemplate',
                        {TEST: originalDataArray}
                    ); */
                }
            }
        );
    } catch (e) {
        console.error(e);
    } finally {
        driver.quit();
    }
};

export default run;
