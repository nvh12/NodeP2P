import { createContext, useContext, useEffect, useRef, useState } from "react";

const P2PContext = createContext();

export const useP2P = () => useContext(P2PContext);

export const P2PProvider = ({ children, socket, config }) => {
    const [rooms, setRooms] = useState([]);
    const roomRef = useRef([]);
    const [connection, setConnection] = useState(false);
    const peerRef = useRef({});
    const dataChannelRef = useRef({});

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('peer-ready', async ({ roomId, peerIds }) => {
            peerRef.current[roomId] ||= {};
            dataChannelRef.current[roomId] ||= {};

            for (const peerId of peerIds) {
                console.log(`New peer ${peerId} in roomRef ${roomId}`);

                const pc = createPeerConnection(roomId, peerId);
                peerRef.current[roomId][peerId] = pc;

                const dc = pc.createDataChannel('files');
                dc.onopen = () => console.log('Data channel open');
                dc.onmessage = (e) => console.log('Got message: ', e.data);
                dataChannelRef.current[roomId][peerId] = dc;

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('send-signal', {
                    to: peerId,
                    roomId,
                    signal: { type: 'offer', sdp: offer.sdp }
                });
            }
        });

        socket.on('signal', async ({ from, roomId, signal }) => {
            peerRef.current[roomId] ||= {};
            dataChannelRef.current[roomId] ||= {};

            const pc = peerRef.current[roomId][from] || createPeerConnection(roomId, from);
            peerRef.current[roomId][from] = pc;

            if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('send-signal', {
                    to: from,
                    roomId: roomId,
                    signal: { type: 'answer', sdp: answer.sdp }
                });
            } else if (signal.type == 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (error) {
                    console.error(error);
                }
            }
        });

        socket.on('peer-left', (roomId, peerId) => {
            console.log(`${peerId} left roomRef ${roomId}`);

            if (peerRef.current[roomId][peerId]) {
                peerRef.current[roomId][peerId].close();
                delete peerRef.current[roomId][peerId];
            }

            if (dataChannelRef.current[roomId][peerId]) {
                delete dataChannelRef.current[roomId][peerId];
            }
        });

        socket.on('disconnect', () => {
            for (const roomId of roomRef.current) {
                leaveRoom(roomId);
            }
        })

        return () => {
            socket.off('connect');
            socket.off('peer-ready');
            socket.off('signal');
            socket.off('peer-left');
            socket.off('disconnect');
        };
    }, []);

    const createPeerConnection = (roomId, peerId) => {
        const pc = new RTCPeerConnection(config);

        pc.onicecandidate = e => {
            if (e.candidate) {
                socket.emit('send-signal', {
                    to: peerId,
                    roomId: roomId,
                    signal: { candidate: e.candidate }
                });
            }
        };

        pc.ondatachannel = e => {
            dataChannelRef.current[roomId][peerId] = e.channel;
            e.channel.onmessage = msgEvent => console.log('Received: ', msgEvent.data);
        }

        return pc;
    };

    const joinRoom = (roomId) => {
        socket.emit('join', roomId);
        if (!roomRef.current.includes(roomId)) {
            roomRef.current = [...roomRef.current, roomId];
            setRooms(roomRef.current);
        }
        if (connection === false) setConnection(true);
    }

    const leaveRoom = (roomId) => {
        socket.emit('leave', roomId);

        if (peerRef.current[roomId]) {
            Object.values(peerRef.current[roomId]).forEach(pc => pc.close());
            delete peerRef.current[roomId];
        }

        if (dataChannelRef.current[roomId]) {
            Object.values(dataChannelRef.current[roomId]).forEach(dc => dc.close());
            delete dataChannelRef.current[roomId];
        }

        roomRef.current = roomRef.current.filter(r => r !== roomId);
        setRooms(roomRef.current);
    };

    return (
        <P2PContext.Provider
            value={{
                roomRef,
                rooms,
                setRooms,
                connection,
                joinRoom,
                leaveRoom,
                peerRef,
                dataChannelRef
            }}
        >
            {children}
        </P2PContext.Provider>
    );
}