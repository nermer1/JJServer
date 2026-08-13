import {Request, Response, NextFunction} from 'express';
import redisTest from '../db/RedisTest.js';
import {validatorUtil as validator, generatorUtils as generator} from '../utils/Utils.js';
import {Users} from '../schemas/users.js';
import ApiReturn from '../structure/ApiReturn.js';
import JJMail from '../mail/sendMail.js';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import axios from 'axios';
import PermissionCacheService from '../service/PermissionCacheService.js';
import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import {DBLogger} from '../utils/DBLogger.js';
import {AppSettings} from '../constants/appSettings.js';

// 테스트 중

class LoginController {
    private async issueTokensForUser(email: string, apiReturn: ApiReturn, res: Response, issueRefresh: boolean = true): Promise<boolean> {
        const secretKey = SystemSettingsCacheService.getRequired(AppSettings.JWT_SECRET);

        const userDoc = await Users.model
            .findOne({email})
            .populate({
                path: 'roles',
                populate: {
                    path: 'permissions'
                }
            })
            .lean();

        if (!userDoc) {
            apiReturn.setReturnErrorMessage('해당 유저를 찾을 수 없습니다.');
            return false;
        }

        const permissionsSet = new Set<string>();
        let maxRoleLevel = 0;
        if (userDoc.roles && Array.isArray(userDoc.roles)) {
            userDoc.roles.forEach((role: any) => {
                if (role.level && role.level > maxRoleLevel) {
                    maxRoleLevel = role.level;
                }
                if (role.permissions && Array.isArray(role.permissions)) {
                    role.permissions.forEach((perm: any) => {
                        if (perm.action) permissionsSet.add(perm.action);
                    });
                }
            });
        }
        const permissions = Array.from(permissionsSet);

        // Redis 권한/레벨 캐싱 (무중단 갱신)
        await PermissionCacheService.cacheUserPermissions(userDoc.email, {permissions, level: maxRoleLevel});

        // JWT Payload 최소화 (권한 제외)
        const payload = {
            userId: userDoc.email,
            department_id: userDoc.department_id?.toString() || null,
            level: maxRoleLevel
        };
        const token = jwt.sign(payload, secretKey, {expiresIn: '24h'});

        res.cookie('token', token, {httpOnly: true, maxAge: 24 * 60 * 60 * 1000});
        apiReturn.put('token', token);

        if (issueRefresh) {
            const refreshToken = jwt.sign({userId: userDoc.email}, secretKey, {expiresIn: '14d'});
            await redisTest.set(`refresh:${userDoc.email}`, refreshToken, {EX: 14 * 24 * 60 * 60});
            apiReturn.put('refreshToken', refreshToken);
        }

        return true;
    }

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
                const success = await this.issueTokensForUser(email, apiReturn, res, true);
                if (!success) {
                    res.json(apiReturn);
                    return;
                }
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

        const secretKey = SystemSettingsCacheService.getRequired(AppSettings.JWT_SECRET);

        let decoded;
        try {
            // 1. 리프레시 토큰 자체의 유효성 검증
            decoded = jwt.verify(refreshToken, secretKey) as any;

            // 1-1. 전역 강제 로그아웃 (Global Logout) 검증 (리프레시 토큰 방어)
            const globalLogoutTimeStr = await redisTest.get('global_logout_time');
            if (globalLogoutTimeStr && decoded.iat) {
                const globalLogoutTime = parseInt(globalLogoutTimeStr, 10);
                if (decoded.iat < globalLogoutTime) {
                    throw new Error('전역 로그아웃 처리된 리프레시 토큰입니다. 다시 로그인 해주세요.');
                }
            }
        } catch (error) {
            logger.error(`리프레시 토큰 검증 실패: ${error}`);
            const err = new Error('리프레시 토큰이 만료되었거나 올바르지 않습니다. 다시 로그인 해주세요.');
            (err as any).status = 401;
            throw err; // 전역 에러 핸들러로 전달
        }

        const userId = decoded.userId;

        // 2. Redis에 저장된 원래의 리프레시 토큰과 일치하는지 확인 (DB 확인)
        const storedRefreshToken = await redisTest.get(`refresh:${userId}`);

        if (storedRefreshToken !== refreshToken) {
            apiReturn.setReturnErrorMessage('유효하지 않거나 폐기된 리프레시 토큰입니다.');
            res.status(401).json(apiReturn);
            return;
        }

        // 3. 다시 토큰을 굽기 위해 DB에서 유저 권한 한 일 번 더 조회 (Populate 적용)
        const success = await this.issueTokensForUser(userId, apiReturn, res, false);
        if (!success) {
            res.status(401).json(apiReturn);
            return;
        }
        apiReturn.setReturnMessage('액세스 토큰 재발급 성공');
        res.json(apiReturn);
    }

    /**
     * 슬랙 로그인 연동 (OAuth 시작점 - OpenID Connect 방식)
     */
    public async slackLoginRedirect(req: Request, res: Response): Promise<void> {
        try {
            const clientId = SystemSettingsCacheService.getRequired('SLACK_CLIENT_ID');
            const redirectUri = SystemSettingsCacheService.getRequired('SLACK_REDIRECT_URI');

            // OpenID Connect (OIDC) 전용 스코프 (이메일 및 프로필 조회용)
            // 주의: 슬랙 대시보드에서 띄어쓰기로 구분되어야 하므로 인코딩 시 주의
            const scopes = 'openid profile email';

            // OIDC 전용 authorize 엔드포인트 사용
            const slackAuthUrl = `https://slack.com/openid/connect/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

            res.redirect(slackAuthUrl);
        } catch (error: any) {
            logger.error(`[Slack OAuth] 리다이렉트 생성 실패: ${error.message}`);
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage('Slack 연동 설정이 되어있지 않습니다.');
            res.status(500).send(apiReturn);
        }
    }

    /**
     * 슬랙 로그인 콜백 (Slack에서 리다이렉트됨 - OpenID Connect 방식)
     */
    public async slackLoginCallback(req: Request, res: Response): Promise<void> {
        const {code, error: slackError} = req.query;

        if (slackError || !code) {
            logger.error(`[Slack OAuth] 콜백 인증 에러: ${slackError}`);
            res.redirect('/?error=slack_login_failed');
            return;
        }

        try {
            const clientId = SystemSettingsCacheService.getRequired('SLACK_CLIENT_ID');
            const clientSecret = SystemSettingsCacheService.getRequired('SLACK_CLIENT_SECRET');
            const redirectUri = SystemSettingsCacheService.getRequired('SLACK_REDIRECT_URI');

            // 1. code로 Access Token 교환 (OIDC 전용 토큰 엔드포인트)
            const tokenResponse = await axios.post('https://slack.com/api/openid.connect.token', null, {
                params: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code as string,
                    redirect_uri: redirectUri
                }
            });

            if (!tokenResponse.data.ok) {
                logger.error(`[Slack OAuth] OIDC 토큰 교환 실패: ${tokenResponse.data.error}`);
                res.redirect('/?error=slack_token_failed');
                return;
            }

            const userToken = tokenResponse.data.access_token;

            // 2. Access Token으로 유저 프로필 조회 (OIDC 전용 userInfo 엔드포인트)
            const profileResponse = await axios.get('https://slack.com/api/openid.connect.userInfo', {
                headers: {
                    Authorization: `Bearer ${userToken}`
                }
            });

            if (!profileResponse.data.ok) {
                logger.error(`[Slack OAuth] OIDC 프로필 조회 실패: ${profileResponse.data.error}`);
                res.redirect('/?error=slack_profile_failed');
                return;
            }

            const email = profileResponse.data.email;
            if (!email) {
                logger.error(`[Slack OAuth] 이메일 정보가 존재하지 않음.`);
                res.redirect('/?error=slack_email_missing');
                return;
            }

            // 3. 얻어낸 이메일로 기존 로그인 로직 수행
            const apiReturn = new ApiReturn();
            const success = await this.issueTokensForUser(email, apiReturn, res, true);

            if (success) {
                logger.info(`[Slack OAuth] 로그인 성공: ${email}`);

                // 프론트엔드가 토큰을 localStorage에 저장할 수 있도록 URL 파라미터로 전달
                let frontendUrl = SystemSettingsCacheService.get('FRONTEND_URL', '/');
                const returnData = apiReturn.getReturnData();

                // URL에 이미 쿼리파라미터가 있는지 여부에 따라 ? 또는 & 사용
                const separator = frontendUrl.includes('?') ? '&' : '?';
                frontendUrl += `${separator}token=${returnData.token}&refreshToken=${returnData.refreshToken}`;

                res.redirect(frontendUrl);
            } else {
                logger.error(`[Slack OAuth] DB 유저 조회 실패: ${email}`);
                res.redirect('/?error=unauthorized_user');
            }
        } catch (error: any) {
            logger.error(`[Slack OAuth] 처리 중 서버 에러: ${error.message}`);
            res.redirect('/?error=internal_server_error');
        }
    }

    /**
     * 전역 강제 로그아웃 트리거 API
     * 시스템 관리자가 호출하면, 현재 시점 이전에 발급된 모든 JWT가 무효화됩니다.
     */
    public async globalLogout(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();

        // 현재 시간을 '초(seconds)' 단위로 구하여 Redis에 기록
        const currentTimestamp = Math.floor(Date.now() / 1000);
        await redisTest.set('global_logout_time', currentTimestamp.toString());

        await DBLogger.log({
            category: 'SYSTEM',
            action: '전역 강제 로그아웃 (Global Logout) 실행',
            userId: (req as any).user?.userId || 'SYSTEM',
            details: {triggerTime: currentTimestamp}
        });

        apiReturn.setReturnMessage('전역 로그아웃 처리가 완료되었습니다. 기존 토큰들은 즉시 무효화됩니다.');
        res.json(apiReturn);
    }
}

// 우선 프로토타입, 동작만 확인 하는 식으로 작성 귀찮아 죽겠네
async function storeAuthNumber(mail: string) {
    const authNumber = await generateUniqueAuthNumber();
    redisTest.set(authNumber, mail, {EX: 60}); // Redis에 저장

    const ttl = await redisTest.client?.ttl(authNumber);

    // 비동기로 메일을 보내되, 에러가 발생해도 서버가 죽지 않도록 catch를 달아줍니다 (비동기 Fire-and-Forget)
    JJMail.sendMailWithMustache('(주)유니포스트" <test@unidocu.unipost.co.kr>', mail, '[유니헬퍼] 로그인 인증번호 안내', 'otp', {authNumber}).catch((err) =>
        logger.error(`[Mail Error] 인증번호 메일 전송 실패: ${err.message}`)
    );

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
