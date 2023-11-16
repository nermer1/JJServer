import HtmlTemplate from '../ui/template/HtmlTemplate.js';
import DateUtils from '../utils/DateUtils.js';
import env from 'dotenv';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const {Builder, By, Key, until} = require('selenium-webdriver');
const nodemailer = require('nodemailer');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios').default;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: '',
        pass: ''
    }
});

let isTest = true;
let isWeb = true;
let isSendMail = true;

//run();

function aaaaa(date1: Date) {
    const lastDate = new Date(date1);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);

    const a = DateUtils.formatDate(lastDate);
    const b = DateUtils.formatDate(fourteenDaysAgo);
    return a.localeCompare(b);
}

async function sendMail(data: any) {
    // send mail with defined transport object
    // 실제 서포트 데이터를 담아서 메일 전송 할 거임
    const template = new HtmlTemplate();
    const info = await transporter.sendMail({
        from: '유니포스트 구독팀 <permes@unipost.co.kr>', // sender address
        to: isTest ? 'permes@unipost.co.kr,jeongho@unipost.co.kr' : isWeb ? 'webhelp@unipost.co.kr' : 'abap@unipost.co.kr', // list of receivers
        subject: '[유니포스트] 서포트 미처리 내역 확인', // Subject line
        //text: 'Hello world?', // plain text body
        html: await template.templateFromFile('./template/mustache/mail/remainingSupportTemplate', {TEST: data})
    });

    console.log('Message sent: %s', info.messageId);
}

async function sendMail2(data: any) {
    // send mail with defined transport object
    const template = new HtmlTemplate();
    const info = await transporter.sendMail({
        from: '유니포스트 구독팀 <permes@unipost.co.kr>', // sender address
        to: isTest ? 'permes@unipost.co.kr,jeongho@unipost.co.kr' : isWeb ? 'webhelp@unipost.co.kr' : 'abap@unipost.co.kr', // list of receivers
        subject: '[유니포스트] 서포트 미처리 내역 확인', // Subject line
        //text: 'Hello world?', // plain text body
        html: await template.templateFromFile('./template/mustache/mail/vacationTemplate', {TEST: data})
    });

    console.log('Message sent: %s', info.messageId);
}

async function run() {
    // headless로 크롬 드라이버 실행

    let chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--blink-settings=imagesEnabled=false');
    chromeOptions.addArguments('--headless');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-popup-blocking');
    chromeOptions.addArguments('--disable-gpu');
    chromeOptions.addArguments('--disable-default-apps');
    chromeOptions.addArguments('--disable-infobars');

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

    try {
        await driver.get('https://114.unipost.co.kr:8543');
        await driver.wait(until.elementLocated(By.id('login-id')), 10000).sendKeys('');
        await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys('');
        await driver.wait(until.elementLocated(By.className('btn_login fid-loginBtn')), 10000).click();

        const cookies = await driver.manage().getCookies();

        // 세션을 생성했더라도 ajax, axios 등을 사용하더라도 세션이 없는 것으로 나옴
        // 셀레니움을 통해 세션을 생성했더라도 해당 세션은 셀레니움에서 별도로 관리한다네
        // 그래서 헤더 정보에 세션을 넣어주는 식으로 호출해야하는 듯

        // 또 어떤 사람은 selenium으론 로그인만 시켜 세션만 생성 후 크롤링은 requests를 사용한다는 듯
        // https://m.blog.naver.com/draco6/221664143794

        //const result = driver.executeScript("return Uni");

        /* // 결과 출력
        result.then(function (value) {
            console.log(value); // "안녕하세요!"
        }); */

        axios({
            headers: {
                Cookie: cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
            },
            method: 'post',
            url: 'https://114.unipost.co.kr:8543/admin/request/requestSearch.do',
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
        }).then((response: any) => {
            const originalDataArray = response.data.response
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

            if (isSendMail) sendMail(originalDataArray);
        });

        /* 여러 post 호출 방식 예제
            function getUserAccount() {
            return axios.get('/user/12345');
            }

            function getUserPermissions() {
            return axios.get('/user/12345/permissions');
            }

            Promise.all([getUserAccount(), getUserPermissions()])
            .then(function (results) {
                const acct = results[0];
                const perm = results[1];
            });
        */

        /* await driver.get('https://map.kakao.com/');
        let userAgent = await driver.executeScript("return navigator.userAgent;")
        console.log('[UserAgent]', userAgent);

        // By.id로 #query Element를 얻어온다.
        let searchInput = await driver.findElement(By.id('search.keyword.query'));
        // keyword를 선택하고 검색 버튼 사용
        let keyword = "닭발";
        searchInput.sendKeys(keyword, Key.ENTER);

        // css selector로 가져온 element가 위치할때까지 최대 10초간 기다린다.
        await driver.wait(until.elementLocated(By.id('info.search.place.list')), 10000);
        let resultElements  = await driver.findElements(By.className("placetit"));

        // 검색한 elements 하위의 value를 출력함
        console.log('[resultElements.length]', resultElements.length)
        for (var i = 0; i < resultElements.length; i++) {
            console.log('- ' + await resultElements[i].getCssValue())
        } */
    } catch (e) {
        console.error(e);
    } finally {
        //driver.quit();
    }
}

//------------------------------------------ 휴가 관련

/**
 * URL 을 받아 해당 URL 을 크롬으로 오픈하는 함수
 */
const chromeOpen = async (url: string) => {
    // headless로 크롬 드라이버 실행
    let chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--blink-settings=imagesEnabled=false');
    chromeOptions.addArguments('--headless');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-popup-blocking');
    chromeOptions.addArguments('--disable-gpu');
    chromeOptions.addArguments('--disable-default-apps');
    chromeOptions.addArguments('--disable-infobars');

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
    await driver.get(url);

    return driver;
};

/**
 * 크롤링하여 휴가 리스트 가져오는 함수
 * @returns {Promise<void>}
 */
const getVacation = async () => {
    const driver = await chromeOpen('https://unipost.co.kr/portal/login/portal-login');
    await driver.wait(until.elementLocated(By.id('login_id')), 10000).sendKeys('');
    await driver.wait(until.elementLocated(By.id('password')), 10000).sendKeys('');
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
            const renderData = renderUseCalcData(vacationList);
            console.log(renderData);
            sendMail2(renderData);
            driver.quit();
        })
    );
};
/**
 * 휴가 리스트 가져오는 API
 * @param options
 * @param deptId
 * @returns {*}
 */
const getVacationAPI = (options: any, deptId: any) => {
    const data = {
        coRegno: options['coRegno'],
        deptId,
        usId: '',
        sSdate: DateUtils.formatDate(new Date('2023-11-17')),
        sEdate: DateUtils.formatDate(new Date('2023-11-17')),
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
    };

    return axios({
        headers: {
            Cookie: options['cookies'].map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
        },
        method: 'post',
        url: 'https://leave.unipost.co.kr/unicloud/avs/manage/getMonthReportAvsUse',
        data
    });
};

//getVacation();
