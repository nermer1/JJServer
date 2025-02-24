import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {basicProperty} from '../properties/ServerProperty.js';
import {createServer} from 'http';
import {router} from '../router/router.js';
import scheduleManager from '../scheduler/mailSendScheduler.js';
//import db from '../db.js';
import {initSocket} from './socket.js';

class Server {
    constructor() {}
}

const app = express();
// const httpServer = createServer(sslOptions, app);
const httpServer = createServer(app);

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use('/', router);

//db.connect();

// 소켓 서버 초기화
const io = initSocket(httpServer);
app.set('socketio', io);

// 스케줄러 실행 관련
scheduleManager.init();

const port = basicProperty.server.port;

httpServer.listen(port, () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log(`Listening on port ${port}`);
});

httpServer.on('close', () => {
    console.log('server down');
    scheduleManager.close();
});
