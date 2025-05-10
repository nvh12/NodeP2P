const http = requier('http');
const { Server } = requier('socket.io');

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

io.on('connection', (socket) => {
    console.log('Client connected: ', socket.id);
    registerSocketHandlers(io, socket);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});