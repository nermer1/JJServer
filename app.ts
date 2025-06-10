import express from 'express';
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

/* let sslOptions = {};

try {
    sslOptions = {
        key: fs.readFileSync(externalProperty.getString('PROD_SSL_KEY')),
        cert: fs.readFileSync(externalProperty.getString('PROD_SSL_CERT'))
    };
} catch (e) {
    console.log(e);
} */

const app = express();
const httpServer = createServer(app);
httpServer.keepAliveTimeout = 0;
//const httpServer = createServer(sslOptions, app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {origin: '*'}
});

app.use(
    cors({
        origin: '*',
        credentials: true
    })
);

app.use(cookieParser());
app.use(express.json());
app.use('/api/v1', router);
app.set('socketio', io);

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

socketServer.on('connection', function (socket: Socket) {
    /* socket.on('disconnect', function () {
        console.log('연결 끊김');
    }); */

    socket.on('hyperV', (room: string) => {
        console.log(room);
        socket.join(room);
    });
});

// 스케줄러 실행 관련
//scheduleManger.init();

const port = basicProperty.server.port;

httpServer.listen(port, () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log(`Listening on port ${port}`);
});
httpServer.on('close', () => {
    console.log('server down');
    scheduleManger.close();
});
