import winston from 'winston';
import 'winston-daily-rotate-file';
import {TransformableInfo} from 'logform';
import path from 'path';
import fs from 'fs';

interface LogInfo extends TransformableInfo {
    timestamp?: string;
}

/**
 * 로그 저장 디렉토리.
 * - 기본값 'logs'는 프로세스 CWD 기준 상대경로(기존 동작).
 * - 배포 환경에서는 LOG_DIR에 "절대경로"를 지정하면 실행 위치(CWD)가 바뀌어도
 *   항상 같은 곳에 로그가 쌓인다. (도커면 그 경로를 볼륨 마운트해서 영속화)
 *   예) LOG_DIR=/var/log/helper  +  -v /host/logs:/var/log/helper
 */
const LOG_DIR = process.env.LOG_DIR || 'logs';
try {
    fs.mkdirSync(LOG_DIR, {recursive: true});
} catch (e) {
    console.error('[logger] 로그 디렉토리 생성 실패:', LOG_DIR, e);
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
            filename: path.join(LOG_DIR, 'app-%DATE%.log'),
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
