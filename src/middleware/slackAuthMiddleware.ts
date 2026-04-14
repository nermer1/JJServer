import {Request, Response, NextFunction} from 'express';
import crypto from 'crypto';
import {basicProperty} from '../properties/ServerProperty.js';
import logger from '../utils/logger.js';

export const verifySlackSignature = (req: Request, res: Response, next: NextFunction) => {
    const slackSignature = req.headers['x-slack-signature'] as string;
    const slackTimestamp = req.headers['x-slack-request-timestamp'] as string;
    const slackSigningSecret = basicProperty.slack.signingSecret;

    if (!slackSigningSecret) {
        logger.error('Slack Signing Secret is not configured (SLACK_SIGNING_SECRET).');
        const err = new Error('Slack Signing Secret is not configured.');
        (err as any).status = 500;
        return next(err);
    }

    if (!slackSignature || !slackTimestamp) {
        const err = new Error('Missing Slack signature headers.');
        (err as any).status = 401;
        return next(err);
    }

    // 재생성 공격(Replay Attack) 방지 로직 (5분 이상 차이나는 요청은 거부)
    const timeNow = Math.floor(Date.now() / 1000);
    if (Math.abs(timeNow - parseInt(slackTimestamp, 10)) > 60 * 5) {
        const err = new Error('Slack request timestamp is too far from current time.');
        (err as any).status = 401;
        return next(err);
    }

    // app.ts 에서 세팅한 req.rawBody 를 가져옴
    const rawBodyBuffer = (req as any).rawBody;
    const rawBodyString = rawBodyBuffer ? rawBodyBuffer.toString('utf8') : '';

    // 서명 베이스 스트링 포맷: v0:요청시간:raw데이터
    const sigBaseString = `v0:${slackTimestamp}:${rawBodyString}`;

    // HMAC-SHA256 암호화 서명 생성
    const mySignature = 'v0=' + crypto.createHmac('sha256', slackSigningSecret).update(sigBaseString, 'utf8').digest('hex');

    // 타이밍 공격(Timing Attack) 방지를 위한 타이밍 세이프 비교
    try {
        // TypeScript 타입 에러 호환을 위해 버퍼를 Uint8Array로 래핑하여 전달
        const myBuffer = new Uint8Array(Buffer.from(mySignature, 'utf8'));
        const extBuffer = new Uint8Array(Buffer.from(slackSignature, 'utf8'));

        if (crypto.timingSafeEqual(myBuffer, extBuffer)) {
            return next();
        } else {
            logger.warn(`Slack signature verification failed. IP: ${req.ip}`);
            const err = new Error('Slack signature verification failed.');
            (err as any).status = 401;
            return next(err);
        }
    } catch (error) {
        // 만약 Buffer 길이가 달라서 예외가 터질 경우 처리
        logger.warn(`Slack signature buffer length mismatch. IP: ${req.ip}`);
        const err = new Error('Slack signature verification failed (Length Mismatch).');
        (err as any).status = 401;
        return next(err);
    }
};

