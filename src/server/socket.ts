import {Server, Socket} from 'socket.io';
import {Server as HttpServer} from 'http';

// 이벤트 타입 정의 (예시)
interface ClientToServerEvents {
    hyperV: (room: string) => void;
}

interface ServerToClientEvents {
    // 예시 이벤트들
}

interface InterServerEvents {
    // 예시 이벤트들
}

interface SocketData {
    // 예시 데이터들
}

export function initSocket(httpServer: HttpServer) {
    const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
        cors: {origin: '*'}
    });

    io.on('connection', (socket: Socket) => {
        console.log('a user connected');

        socket.on('hyperV', (room: string) => {
            console.log(room);
            socket.join(room);
        });

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });

    return io;
}
