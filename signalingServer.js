import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer();
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', socket => {
    console.log('Socket connected: ', socket.id);

    socket.on('join', roomId => {
        socket.join(roomId);

        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        const otherIds = clients.filter(id => id !== socket.id);
        if (otherIds) {
            socket.emit('peer-ready', {
                roomId: roomId,
                peerIds: otherIds
            });
            socket.to(roomId).emit('peer-ready', {
                roomId: roomId,
                peerIds: socket.id
            });
        }
    });

    socket.on('send-signal', ({ to, signal, roomId }) => {
        io.to(to).emit('signal', {
            from: socket.id,
            roomId: roomId,
            signal: signal
        });
    });

    socket.on('leave', (roomId) => {
        socket.leave(roomId);
        socket.to(roomId).emit('peer-left', {
            roomId: roomId,
            peerId: socket.id
        });
    });

    socket.on('disconnect', () => {
        for (const roomId of socket.rooms) {
            socket.to(roomId).emit('peer-left', {
                roomId: roomId,
                peerId: socket.id
            });
        }
    });
});

server.listen(5000, () => console.log(`http://localhost:5000`));