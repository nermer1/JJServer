import express from 'express';
import cors from 'cors';
import {basicProperty} from './src/properties/ServerProperty.js';
import {createServer} from 'http';
import {Server, Socket} from 'socket.io';
import {router} from './src/router/router.js';
import scheduleManger from './src/scheduler/mailSendScheduler.js';
import db from './src/db.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {cors: {origin: '*'}});

app.use(cors());
app.use(express.json());
app.use('/', router);
app.set('socketio', io);

db.connect();

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
scheduleManger.init();

const port = basicProperty.server.port;

httpServer.listen(port, () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log(`Listening on port ${port}`);
});
httpServer.on('close', () => {
    console.log('server down');
    scheduleManger.close();
});
