import {jjUtil} from '../utils/JJUtils.js';
import {basicProperty} from '../properties/ServerProperty.js';
import {axiosCall} from '../modules/httpClient/httpClient.js';
import {webdriver, sendMail, Key, By, until} from './subscriptionGroupManager.js';

const isWeb = true;
const isTest = true;

function getParams() {
    const date = {
        from: jjUtil.dateUtil.formatDate(new Date(new Date().setDate(new Date().getDate() - 60)), 'yyyy-MM-dd'),
        to: jjUtil.dateUtil.formatDate(jjUtil.dateUtil.getLastFridayOfLastWeek(), 'yyyy-MM-dd')
    };

    return {
        mail: {
            send: '유니포스트 구독팀 <permes@unipost.co.kr>',
            receiver: isTest ? 'permes@unipost.co.kr' : 'webhelp@unipost.co.kr',
            subject: '[유니포스트] 구독팀 서포트 미처리 내역 확인',
            mustache: 'remainingSupportTemplate',
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
                url: 'https://114.unipost.co.kr:8543/admin/request/requestSearch.do',
                data: {
                    searchDateType: 'R',
                    startDate: date.from,
                    endDate: date.to,
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
            }
        }
    };
}

function aaaaa(date1: Date) {
    const lastDate = new Date(date1);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);

    const a = jjUtil.dateUtil.formatDate(lastDate);
    const b = jjUtil.dateUtil.formatDate(fourteenDaysAgo);
    return a.localeCompare(b);
}

const run = async () => {
    const params: UnipostSelelniumParams = getParams();
    const driver = await webdriver(params.driver.front.url);

    try {
        await driver.wait(until.elementLocated(By.id('login-id')), 10000).sendKeys(basicProperty.selenium.support.user);
        await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys(basicProperty.selenium.support.password);
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
                params.mail.data.INFO_DATA = data.response
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
