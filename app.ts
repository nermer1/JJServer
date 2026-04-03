import express from 'express';
import {Request, Response, NextFunction} from 'express';
import 'express-async-errors';
import cors from 'cors';
import fs from 'fs';
import {externalProperty, basicProperty} from './src/properties/ServerProperty.js';
//import {createServer} from 'https';
import {createServer} from 'http';
import {Server, Socket} from 'socket.io';
import router from './src/router/router.js';
import scheduleManger from './src/scheduler/mailSendScheduler.js';
//import db from './src/db.js';
import DBFactory from './src/factory/DBFactory.js';
import redisTest from './src/db/RedisTest.js';
//import redoc from 'redoc-express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cookieParser from 'cookie-parser';
import {router as hyperv} from './src/router/hyperv.js';
import errorHandler from './src/middleware/errorHandler.js';
import {verifyApiToken} from './src/middleware/authMiddleware.js';
import logger from './src/utils/logger.js';
import rateLimit from 'express-rate-limit';
import {initHypervSocket} from './src/socket/HypervSocket.js';
import HypervSocketService from './src/service/HypervSocketService.js';
import WebPushService from './src/service/WebPushService.js';
const app = express();
const httpServer = createServer(app);
httpServer.keepAliveTimeout = 0;

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {origin: '*'}
});

// 윈도우 도커 내 엔진엑스 컨테이너는 실 아이피를 받아오지 못하는 버그가 있는 듯 일단 주석처리
/* const publicApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 60,
    message: '1분간 차단',
    keyGenerator: (req: Request): string => {
        // Nginx를 거치면 req.ip가 Nginx의 내부 IP(127.0.0.1 등)로 고정될 수 있습니다.
        // 클라이언트의 진짜 IP가 담긴 X-Forwarded-For 헤더를 최우선으로 빼옵니다.
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;

        // --- 디버깅용 로그 추가 ---
        logger.info(`[RateLimiter Debug] req.ip: ${req.ip} | x-forwarded-for: ${forwarded} | Final IP: ${clientIp}`);

        return clientIp || 'unknown_ip';
    }
}); */

app.set('trust proxy', 1);
app.use(
    cors({
        origin: '*',
        credentials: true
    })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
//app.use('/api/v1', publicApiLimiter, verifyApiToken, router);
app.use('/api/v1', verifyApiToken, router);
app.use('/hyperv', verifyApiToken, hyperv);
app.set('socketio', io);
app.use(errorHandler);

const swaggerApiHost: ObjType = {
    localhost: `http://localhost:${basicProperty.server.port}`,
    alpha: 'https://helper.unipost.co.kr:9443/server/',
    dev: 'https://helper.unipost.co.kr:8443/server/',
    prd: 'https://helper.unipost.co.kr/server/'
};

const apiUrl = swaggerApiHost[basicProperty.server.alias] || swaggerApiHost.localhost;

const swaggerOptions = {
    doc: {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'helper API 명세서',
                version: '1.0.0'
            },
            servers: [{url: apiUrl}]
        },
        apis: ['./swagger/*.swagger.js']
    },
    swagger: {}
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions.doc), swaggerOptions.swagger));

const mongoTest = DBFactory.createDB('mongo');
mongoTest.connect();
redisTest.connect();

const socketServer = app.get('socketio');

initHypervSocket(socketServer);

// 스케줄러 실행 관련
//scheduleManger.init();

const port = basicProperty.server.port;

httpServer.listen(port, () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    logger.info('Server starting...');
    logger.info(`Listening on port ${port}`);
    HypervSocketService.init(socketServer);
    WebPushService.init();
});
httpServer.on('close', () => {
    logger.info('server down');
    scheduleManger.close();
});
