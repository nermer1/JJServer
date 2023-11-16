import nodemailer from 'nodemailer';
import HtmlTemplate from '../ui/template/HtmlTemplate.js';
import ServerProperty from '../properties/ServerProperty.js';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: '',
        pass: ''
    }
});

async function sendMail(data: any) {
    const template = new HtmlTemplate();
    const info = await transporter.sendMail({
        from: '유니포스트 구독팀 <permes@unipost.co.kr>',
        to: 'permes@unipost.co.kr,jeongho@unipost.co.kr',
        subject: '[유니포스트] 서포트 미처리 내역 확인',
        html: await template.templateFromFile('../ui/template/mustache/mail/remainingSupportTemplate', {TEST: data})
    });

    console.log('Message sent: %s', info.messageId);
}
