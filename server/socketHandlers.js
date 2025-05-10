function registerSocketHandlers(io, socket) {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} joined ${roomId}`);
        socket.to(roomId).emit('peer-ready', socket.id);
    });

    socket.on('signal', ({ roomId, signalData }) => {
        socket.to(roomId).emit('signal', {
            sender: socket.id,
            signalData
        });
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
}

module.exports = registerSocketHandlers;