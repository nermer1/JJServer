import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const {Builder} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * URL 을 받아 해당 URL 을 크롬으로 오픈하는 함수
 */
export const webdriver = async (url: string) => {
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
