import nodemailer from 'nodemailer';
import HtmlTemplate from '../ui/template/HtmlTemplate.js';
import {basicProperty} from '../properties/ServerProperty.js';
import logger from '../utils/logger.js';

import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import {AppSettings} from '../constants/appSettings.js';

let _transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: SystemSettingsCacheService.getRequired(AppSettings.SMTP_HOST),
            port: Number(SystemSettingsCacheService.getRequired(AppSettings.SMTP_PORT)),
            secure: false
            /* auth: {
                user: SystemSettingsCacheService.getRequired('SMTP_USER'),
                pass: SystemSettingsCacheService.getRequired('SMTP_PASS')
            } */
        });
    }
    return _transporter;
};

// 설정 변경 시 명시적으로 호출할 리로드 함수
export const reloadTransporter = () => {
    _transporter = null;
    logger.info('[Mail] 메일 발송 Transporter 캐시가 비워졌습니다. (다음 호출 시 재초기화)');
};

class JJMail {
    static async sendMailWithMustache(sender: string, reciever: string, subject: string, mustacheName: string, data: any) {
        const template = new HtmlTemplate();
        const info = await getTransporter().sendMail({
            from: sender,
            to: reciever,
            subject,
            html: await template.templateFromFile(`/src/ui/template/mustache/mail/${mustacheName}`, data)
        });

        logger.info('메일 전송 완료', {meta: {to: reciever, subject}});
    }

    static async sendMailWithHtml(sender: string, reciever: string, subject: string, html: any) {
        const template = new HtmlTemplate();
        const info = await getTransporter().sendMail({
            from: sender,
            to: reciever,
            subject,
            html
        });

        logger.info('Message sent', {meta: {id: info.messageId}});
    }
}

export default JJMail;
