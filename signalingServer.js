import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Socket.IO signaling server is running.\n');
    }
});

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET']
    }
});

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
            if (roomId !== socket.id) {
                socket.to(roomId).emit('peer-left', {
                    roomId: roomId,
                    peerId: socket.id
                });
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
