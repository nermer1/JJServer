import winston from 'winston';
import 'winston-daily-rotate-file';
import 'winston-mongodb';
import {TransformableInfo} from 'logform';
import {basicProperty} from '../properties/ServerProperty.js';
import {stringUtil} from './Utils.js';

interface LogInfo extends TransformableInfo {
    timestamp?: string;
}

const MONGO_URI = stringUtil.format(basicProperty.db.host, {
    user: basicProperty.db.user,
    password: basicProperty.db.password
});

const onlyAllowDbFlag = winston.format((info, opts) => {
    // 로그 찍을 때 { saveToDb: true } 라는 옵션이 있으면 통과(return info)
    if (info.saveToDb) {
        return info;
    }
    // 없으면 몽고DB로는 안 보냄 (return false)
    return false;
});

const logPrintFormat = winston.format.printf((info) => {
    const {timestamp, level, message, ...meta} = info;
    const metaString = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`; // 여기선 순수 글자만 리턴
});

const mongoTransport = new winston.transports.MongoDB({
    level: 'info',
    db: MONGO_URI || '', // 환경변수 처리 권장
    collection: 'important_logs',
    options: {useUnifiedTopology: true},
    metaKey: 'meta',
    format: winston.format.combine(
        winston.format.json() // ★ DB는 JSON 포맷 (색상 X)
    )
});

// Winston MongoDB 트랜스포트 자체에서 발생하는 에러(타임아웃 등)를 캐치하여 프로세스 크래시 방지
mongoTransport.on('error', (err) => {
    console.error('[Winston MongoDB Error] 로그 저장 중 에러 발생 (서버 다운 방지):', err);
});

const logger = winston.createLogger({
    level: 'info',
    // 2. 루트 포맷: 여기엔 절대 colorize를 넣지 마세요! (모든 곳에 영향을 줌)
    format: winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),

    transports: [
        // 3. 콘솔 (Console): 여기서만 색상을 입힙니다.
        new winston.transports.Console({
            format: winston.format.combine(
                //winston.format.colorize({all: true}), // ★ 색상은 콘솔에만!
                logPrintFormat // 구조 적용
            )
        }),

        // 4. 파일 (File): 색상 없이 순수 텍스트만 저장
        new winston.transports.DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            format: winston.format.combine(
                logPrintFormat // ★ 색상 함수(colorize) 없음!
            )
        }),

        // 5. DB (MongoDB): 색상 없는 순수 데이터 저장
        mongoTransport
    ]
});

// Logger 자체에서 발생하는 에러 캐치 (보험용)
logger.on('error', (err) => {
    console.error('[Winston Logger Error] 로거 에러 발생:', err);
});

export default logger;
