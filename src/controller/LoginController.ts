import {Request, Response, NextFunction} from 'express';
import redisTest from '../db/RedisTest.js';
import {validatorUtil as validator, generatorUtils as generator} from '../utils/Utils.js';
import {Users} from '../schemas/user.js';
import ApiReturn from '../structure/ApiReturn.js';
import JJMail from '../mail/sendMail.js';

class LoginController {
    public async test(req: Request, res: Response): Promise<void> {
        let {email, authNumber} = req.body;
        // 이메일 검증(생략한다 안한다?) 존재하면 메일로 인증번호 전송?
        // 이메일이 아닌 아이디면 @unipost.co.kr 기본값으로 붙여줌
        // 인증 번호 발송 및 레디스 저장
        // 인증 번호 넘어 오면 레디스 확인, 유효시간 확인
        // 성공 시 jwt 발급
        // 실패 시 에러 메시지

        const apiReturn = new ApiReturn();

        if (!!email && !authNumber) {
            if (!validator.isEmail(email)) {
                email += '@unipost.co.kr';
            }
            const hasEmail = await checkEmail(email);
            if (!hasEmail) {
                apiReturn.setReturnErrorMessage('입력한 정보를 다시 확인해주세요.');
                res.json(apiReturn);
                return;
            }
            const {ttl} = await storeAuthNumber(email);
            apiReturn.put('ttl', ttl);
        } else if (!!authNumber && !!email) {
            const auth = await redisTest.get(authNumber);
            if (!auth) {
                apiReturn.setReturnErrorMessage('try again');
            } else {
                apiReturn.setReturnMessage('토큰 발행');
                redisTest.del(authNumber);
            }
        } else {
            apiReturn.setReturnErrorMessage('파라미터 확인 필요');
        }

        console.log('email:' + email, ' auth: ' + authNumber);
        res.json(apiReturn);
    }
}

// 우선 프로토타입, 동작만 확인 하는 식으로 작성 귀찮아 죽겠네
async function storeAuthNumber(mail: string) {
    const authNumber = await generateUniqueAuthNumber();
    redisTest.set(authNumber, mail, {EX: 60}); // Redis에 저장

    const ttl = await redisTest.client?.ttl(authNumber);

    JJMail.sendMailWithHtml('(주)유니포스트" <test@unidocu.unipost.co.kr>', mail, 'helper 인증 번호', authNumber);

    return {ttl};
}

async function generateUniqueAuthNumber(): Promise<string> {
    const authNumber = generator.generateRandomString();
    const exists = await redisTest.get(authNumber);

    if (exists) return generateUniqueAuthNumber();

    return authNumber;
}

async function checkEmail(email: string) {
    return Users.hasRecord({USER_MAIL: email});
}

export default new LoginController();
