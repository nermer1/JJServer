import winston from 'winston';
import 'winston-daily-rotate-file';
import {TransformableInfo} from 'logform';

interface LogInfo extends TransformableInfo {
    timestamp?: string;
}

const logPrintFormat = winston.format.printf((info) => {
    const {timestamp, level, message, ...meta} = info;
    const metaString = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`; // 여기선 순수 글자만 리턴
});

const logger = winston.createLogger({
    level: 'info',
    // 루트 포맷: 여기엔 절대 colorize를 넣지 마세요! (모든 곳에 영향을 줌)
    format: winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),

    transports: [
        // 1. 콘솔 (Console): 여기서만 색상을 입힙니다.
        new winston.transports.Console({
            format: winston.format.combine(
                //winston.format.colorize({all: true}), // ★ 색상은 콘솔에만!
                logPrintFormat // 구조 적용
            )
        }),

        // 2. 파일 (File): 색상 없이 순수 텍스트만 저장
        new winston.transports.DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            format: winston.format.combine(
                logPrintFormat // ★ 색상 함수(colorize) 없음!
            )
        })
    ]
});

// Logger 자체에서 발생하는 에러 캐치 (보험용)
logger.on('error', (err) => {
    console.error('[Winston Logger Error] 로거 에러 발생:', err);
});

export default logger;
