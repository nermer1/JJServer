import {Request, Response, NextFunction} from 'express';
import nodemailer from 'nodemailer';
import redisTest from '../db/RedisTest';

class LoginController {
    public test(req: Request, res: Response): void {
        const {mail, authNumber} = req.body;
        // 이메일 검증(생략한다 안한다?) 존재하면 메일로 인증번호 전송?
        // 인증 번호 발송 및 레디스 저장
        // 인증 번호 넘어 오면 레디스 확인, 유효시간 확인
        // 성공 시 jwt 발급
        // 실패 시 에러 메시지
        //res.json({data: unidocuLicenseService.getEncryptText(cryptoText)});

        storeAuthNumber(mail);

        //인증 번호 맞으면 ㅇㅋ

        res.json({data: 'success'});
    }
}

const transporter = nodemailer.createTransport({
    host: '192.168.11.17',
    port: 25,
    secure: false
});

async function sendMailWithMustache(mail: string, authNumber: string) {
    const info = await transporter.sendMail({
        from: '"(주)유니포스트" <test@unidocu.unipost.co.kr>',
        to: '',
        subject: 'helper 인증 번호',
        html: ''
    });
}

// 우선 프로토타입, 동작만 확인 하는 식으로 작성 귀찮아 죽겠네
async function storeAuthNumber(mail: string) {
    const authNumber = await generateUniqueAuthNumber();
    await redisTest.set(authNumber, mail, {EX: 60}); // Redis에 저장
    sendMailWithMustache(mail, authNumber); // 메일 전송
}

async function generateUniqueAuthNumber(): Promise<string> {
    const authNumber = generateRandomString();
    const exists = await redisTest.get(authNumber);

    if (exists) {
        return generateUniqueAuthNumber();
    }

    return authNumber;
}

function generateRandomString() {
    // 6자리 a-zA-Z0-9 랜덤 추출
    let result = '';
    for (let i = 0; i < 6; i++) {
        const rand = Math.floor(Math.random() * 62); // 62개 문자 중 하나 선택

        let charCode;
        if (rand < 26) {
            charCode = 65 + rand; // 'A' ~ 'Z' (65 ~ 90)
        } else if (rand < 52) {
            charCode = 97 + (rand - 26); // 'a' ~ 'z' (97 ~ 122)
        } else {
            charCode = 48 + (rand - 52); // '0' ~ '9' (48 ~ 57)
        }

        result += String.fromCharCode(charCode);
    }
    return result;
}

export default new LoginController();
