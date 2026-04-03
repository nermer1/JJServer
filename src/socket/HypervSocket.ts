import {Server, Socket} from 'socket.io';
import HypervSocketService from '../service/HypervSocketService.js';
import logger from '../utils/logger.js';

export function initHypervSocket(io: Server): void {
    logger.info('[socket] initHypervSocket 등록');

    io.on('connection', async (socket: Socket) => {
        socket.on('join-room', (data: any) => {
            const hostname = data?.hostname;
            if (hostname) {
                socket.join(hostname);
                logger.info(`[socket] ${socket.id} joined room: ${hostname}`);
            }
        });

        logger.info(`[socket] connected: ${socket.id}`);
        const initialStatus = await HypervSocketService.computeVmStatus();
        socket.emit('vm-status-update', initialStatus);

        socket.on('disconnect', () => {
            logger.info(`[socket] disconnected: ${socket.id}`);
        });
    });
}

