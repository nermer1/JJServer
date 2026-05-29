import {Request, Response, NextFunction} from 'express';
import redisTest from '../db/RedisTest.js';
import {validatorUtil as validator, generatorUtils as generator} from '../utils/Utils.js';
import {Users} from '../schemas/users.js';
import ApiReturn from '../structure/ApiReturn.js';
import JJMail from '../mail/sendMail.js';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import PermissionCacheService from '../service/PermissionCacheService.js';

// 테스트 중

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

        if (!validator.isEmail(email)) email += '@unipost.co.kr';

        // 이메일 검증
        if (!!email && !authNumber) {
            const hasEmail = await checkEmail(email);
            if (!hasEmail) {
                apiReturn.setReturnErrorMessage('입력한 정보를 다시 확인해주세요.');
                res.json(apiReturn);
                return;
            }
            const {ttl} = await storeAuthNumber(email); // 인증 시간 내려줌
            apiReturn.put('ttl', ttl);
        } else if (!!authNumber && !!email) {
            const auth = await redisTest.get(authNumber);
            if (!auth) {
                apiReturn.setReturnErrorMessage('확실 해요?');
            } else {
                // 토큰 발행
                // 시크릿키는 환경변수로 따로 빼야함
                const secretKey = 'test';

                // email로 사원 정보 조회?

                const userDoc = await Users.model.findOne({email}).populate({
                    path: 'roles',
                    populate: {
                        path: 'permissions'
                    }
                }).lean();

                if (!userDoc) {
                    apiReturn.setReturnErrorMessage('해당 유저를 찾을 수 없습니다.');
                    res.json(apiReturn);
                    return;
                }

                const permissionsSet = new Set<string>();
                if (userDoc.roles && Array.isArray(userDoc.roles)) {
                    userDoc.roles.forEach((role: any) => {
                        if (role.permissions && Array.isArray(role.permissions)) {
                            role.permissions.forEach((perm: any) => {
                                if (perm.action) permissionsSet.add(perm.action);
                            });
                        }
                    });
                }
                const permissions = Array.from(permissionsSet);

                // Redis 권한 캐싱 (B방식 적용)
                await PermissionCacheService.cacheUserPermissions(userDoc.email, permissions);

                // JWT Payload 최소화 (권한 제외)
                const payload = {userId: userDoc.email};
                const token = jwt.sign(payload, secretKey, {expiresIn: '24h'});

                // Refresh Token 발급 및 Redis 저장 (14일 수명)
                const refreshToken = jwt.sign({userId: userDoc.email}, secretKey, {expiresIn: '14d'});
                await redisTest.set(`refresh:${userDoc.email}`, refreshToken, {EX: 14 * 24 * 60 * 60});

                res.cookie('token', token, {httpOnly: true});
                apiReturn.put('token', token);
                apiReturn.put('refreshToken', refreshToken);
                apiReturn.setReturnMessage('액세스 토큰 및 리프레시 토큰 발행');
                redisTest.del(authNumber);
            }
        } else {
            apiReturn.setReturnErrorMessage('파라미터 확인 필요');
        }

        logger.info('이메일, 인증번호', {meta: {email, authNumber}});
        res.json(apiReturn);
    }

    /**
     * 리프레시 토큰을 이용한 액세스 토큰 재발급
     */
    public async refresh(req: Request, res: Response): Promise<void> {
        const {refreshToken} = req.body;
        const apiReturn = new ApiReturn();

        if (!refreshToken) {
            apiReturn.setReturnErrorMessage('리프레시 토큰 정보가 없습니다.');
            res.status(401).json(apiReturn);
            return;
        }

        const secretKey = 'test'; // 추후 환경변수로 분리

        try {
            // 1. 리프레시 토큰 자체의 유효성 검증
            const decoded = jwt.verify(refreshToken, secretKey) as any;
            const userId = decoded.userId;

            // 2. Redis에 저장된 원래의 리프레시 토큰과 일치하는지 확인 (DB 확인)
            const storedRefreshToken = await redisTest.get(`refresh:${userId}`);

            if (storedRefreshToken !== refreshToken) {
                apiReturn.setReturnErrorMessage('유효하지 않거나 폐기된 리프레시 토큰입니다.');
                res.status(401).json(apiReturn);
                return;
            }

            // 3. 다시 토큰을 굽기 위해 DB에서 유저 권한 한 번 더 조회 (Populate 적용)
            const userDoc = await Users.model.findOne({email: userId}).populate({
                path: 'roles',
                populate: {
                    path: 'permissions'
                }
            }).lean();

            if (!userDoc) {
                apiReturn.setReturnErrorMessage('해당 유저 정보를 찾을 수 없습니다.');
                res.status(401).json(apiReturn);
                return;
            }

            const permissionsSet = new Set<string>();
            if (userDoc.roles && Array.isArray(userDoc.roles)) {
                userDoc.roles.forEach((role: any) => {
                    if (role.permissions && Array.isArray(role.permissions)) {
                        role.permissions.forEach((perm: any) => {
                            if (perm.action) permissionsSet.add(perm.action);
                        });
                    }
                });
            }
            const permissions = Array.from(permissionsSet);

            // Redis 권한 캐싱 (B방식 적용)
            await PermissionCacheService.cacheUserPermissions(userDoc.email, permissions);

            // JWT Payload 최소화 (권한 제외)
            const payload = {userId: userDoc.email};

            // 4. 새로운 Access Token만 달랑 구워서 내려줌 (테스트용 1m -> 24h)
            const token = jwt.sign(payload, secretKey, {expiresIn: '24h'});

            res.cookie('token', token, {httpOnly: true});
            apiReturn.put('token', token);
            apiReturn.setReturnMessage('액세스 토큰 재발급 성공');
            res.json(apiReturn);
        } catch (error) {
            logger.error(`리프레시 토큰 검증 실패: ${error}`);
            apiReturn.setReturnErrorMessage('리프레시 토큰이 만료되었거나 올바르지 않습니다. 다시 로그인 해주세요.');
            res.status(401).json(apiReturn);
        }
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

    if (exists) return await generateUniqueAuthNumber();

    return authNumber;
}

async function checkEmail(email: string) {
    return await Users.hasRecord({email});
}

export default new LoginController();
