import nodemailer from 'nodemailer';
import HtmlTemplate from '../ui/template/HtmlTemplate.js';
import {basicProperty} from '../properties/ServerProperty.js';

const transporter = nodemailer.createTransport({
    host: basicProperty.smtp.host,
    port: basicProperty.smtp.port,
    secure: false,
    auth: {
        user: basicProperty.smtp.user,
        pass: basicProperty.smtp.password
    }
});

class JJMail {
    static async sendMailWithMustache(sender: string, reciever: string, subject: string, mustacheName: string, data: any) {
        const template = new HtmlTemplate();
        const info = await transporter.sendMail({
            from: sender,
            to: reciever,
            subject: subject,
            html: await template.templateFromFile(`/src/ui/template/mustache/mail/${mustacheName}`, data)
        });

        console.log('Message sent: %s', info.messageId);
    }
}

export default JJMail;
