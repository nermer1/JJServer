import {basicProperty} from '../properties/ServerProperty.js';
import {webdriver, sendMail, Key, By, until} from './subscriptionGroupManager.js';
import {axios} from '../modules/httpClient/httpClient.js';
import {jjUtil} from '../utils/JJUtils.js';
import moment from 'moment-timezone';

const isTest = true;

/* function getToday() {
    return moment.tz('Asia/Seoul').format('YYYY-MM-DD');
} */

function getParams() {
    return {
        mail: {
            send: '유니포스트 구독팀 <permes@unipost.co.kr>',
            receiver: isTest ? 'permes@unipost.co.kr' : 'webhelp@unipost.co.kr',
            subject: '[유니포스트] 구독팀 오늘의 휴가자 안내',
            mustache: 'vacationTemplate',
            data: {
                DATE: jjUtil.dateUtil.formatDate(new Date(), 'yyyy-MM-dd'),
                INFO_DATA: []
            }
        },
        driver: {
            front: {
                url: 'https://unipost.co.kr/portal/login/portal-login',
                id: basicProperty.selenium.portal.user,
                pass: basicProperty.selenium.portal.password
            },
            end: {
                url: 'https://leave.unipost.co.kr/unicloud/avs/manage/getMonthReportAvsUse',
                data: {
                    coRegno: '',
                    deptId: '',
                    usId: '',
                    sSdate: jjUtil.dateUtil.formatDate(new Date()),
                    sEdate: jjUtil.dateUtil.formatDate(new Date()),
                    itemIds: [
                        '2673DED180C14058A5492AD0C6593D45',
                        '01A614219FAE435E991B16B84956D5E4',
                        '5F451BD3A3A042C889FDCD8334FE5826',
                        'CC63430C4EB746E8BCF2629483F6C646',
                        'B4D79AED292B8991E050E7DE961F6DAB',
                        'B4D79AED292D8991E050E7DE961F6DAB',
                        '2A65F1A08644427EB79313D8DED9F5DA',
                        'holidayWork'
                    ],
                    progSts: 'S'
                }
            }
        }
    };
}

/**
 * 크롤링하여 휴가 리스트 가져오는 함수
 * @returns {Promise<void>}
 */
const getVacation = async () => {
    const params: UnipostSelelniumParams = getParams();
    const driver = await webdriver(params.driver.front.url);
    try {
        await driver.wait(until.elementLocated(By.id('login_id')), 10000).sendKeys(params.driver.front.id);
        await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys(params.driver.front.pass);
        await driver.wait(until.elementLocated(By.className('btn-login bid-btnLogin')), 10000).click();
        await driver.wait(until.elementLocated(By.className('btn-link id-svcMenuLink AVS')), 10000).click();
        await driver.wait(until.elementLocated(By.className('btn-s btn-c1-line bid-btnUseReg')), 10000);

        const coRegno = await driver.executeScript('return Uni.session.getCoMaster().coRegno');
        const cookies = await driver.manage().getCookies();
        const deptId = ['000902', '000903'];

        const options = {coRegno, cookies};

        const vacationList: any = [];

        const setVacationList = (vacationData: any, part: any) => {
            for (let i = 0; i < vacationData.length; i++) {
                const vacationItem = vacationData[i];
                vacationList.push({
                    usName: vacationItem['usName'],
                    timeUnit: vacationItem['timeUnit'],
                    useDayCnt: vacationItem['useDayCnt'],
                    useStime: vacationItem['useStime'],
                    useEtime: vacationItem['useEtime'],
                    useTimeTypeName: vacationItem['useTimeTypeName'],
                    timeUnitName: vacationItem['timeUnitName'],
                    useSdate: vacationItem['useSdate'],
                    useEdate: vacationItem['useEdate'],
                    remainingVacation: Number(vacationItem['allowDayCnt']) - Number(vacationItem['useDayCnt']),
                    part
                });
            }
        };
        /**
         * 화면에 렌더링 하게 데이터 가공화 ( 유니포스트 클라우드에 있는 소스 참고함 )
         * @param data
         * @returns {*[]}
         */
        const renderUseCalcData = (data: any) => {
            const events = [];
            for (let i = 0; i < data.length; i++) {
                const useDayCnt =
                    data[i]['timeUnit'] === '10'
                        ? data[i]['useDayCnt'] + '일'
                        : data[i]['useStime'] && data[i]['useEtime']
                        ? data[i]['useStime'] + '~' + data[i]['useEtime']
                        : data[i]['useTimeTypeName'] + ' ' + data[i]['timeUnitName'];
                const item = data[i];
                events.push({
                    start: item['useSdate'],
                    end: item['useEdate'],
                    title: item['usName'] + '(' + useDayCnt + ')',
                    part: item['part'],
                    remainingVacation: item['remainingVacation']
                });
            }

            return events;
        };
        axios.all([getVacationAPI(options, deptId[0]), getVacationAPI(options, deptId[1])]).then(
            axios.spread((res1: any, res2: any) => {
                setVacationList(res1.data.response, 'SAP');
                setVacationList(res2.data.response, 'WEB');
                params.mail.data.INFO_DATA = renderUseCalcData(vacationList);
                sendMail(params.mail);
            })
        );
    } catch (e) {
        console.error(e);
    } finally {
        driver.quit();
    }
};
/**
 * 휴가 리스트 가져오는 API
 * @param options
 * @param deptId
 * @returns {*}
 */
const getVacationAPI = (options: any, deptId: any) => {
    const params: UnipostSelelniumParams = getParams();
    params.driver.end.data['coRegno'] = options['coRegno'];
    params.driver.end.data['deptId'] = deptId;

    return axios({
        headers: {
            Cookie: options['cookies'].map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
        },
        method: 'post',
        url: params.driver.end.url,
        data: params.driver.end.data
    });
};

export default getVacation;
