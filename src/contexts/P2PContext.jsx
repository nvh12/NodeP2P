import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useTransfer } from './TransferContext';

const P2PContext = createContext();

export const useP2P = () => useContext(P2PContext);

export const P2PProvider = ({ children, socket, config }) => {
    const roomRef = useRef([]);
    const [connection, setConnection] = useState(false);
    const [joinedRooms, setJoinedRooms] = useState([]);
    const [roomPeers, setRoomPeers] = useState({});
    const peerRef = useRef({});
    const { registerDataChannel, dataChannelRef } = useTransfer();
    const listenersInitialized = useRef(false);

    useEffect(() => {
        if (!socket || listenersInitialized.current) return;

        listenersInitialized.current = true;

        let peerReadyHandled = false;

        socket.on('connect', () => {
            console.log('Client connected with ID:', socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err);
        });

        socket.on('peer-ready', async ({ roomId, peerIds }) => {
            if (peerReadyHandled) return;
            peerReadyHandled = true;
            peerRef.current[roomId] ||= {};
            dataChannelRef.current[roomId] ||= {};

            for (const peerId of peerIds) {
                if (peerRef.current[roomId][peerId]) continue;

                console.log(`New peer ${peerId} in roomRef ${roomId}`);

                const pc = createPeerConnection(roomId, peerId);
                peerRef.current[roomId][peerId] = pc;

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
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    }
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
                dataChannelRef.current[roomId][peerId].close();
                delete dataChannelRef.current[roomId][peerId];
            }


        });

        socket.on('disconnect', () => {
            for (const roomId of roomRef.current) {
                leaveRoom(roomId);
                peerRef.current = {};
                dataChannelRef.current = {};
                setConnection(false);
                roomRef.current = [];
            }
        });

        // setTimeout(() => {
        //     const stored = localStorage.getItem('joinedRooms');
        //     if (stored) {
        //         const rooms = JSON.parse(stored);
        //         roomRef.current = rooms;
        //         setJoinedRooms(rooms);
        //         rooms.forEach(joinRoom);
        //     }
        // }, 250);

        return () => {
            socket.off('connect');
            socket.off('peer-ready');
            socket.off('signal');
            socket.off('peer-left');
            socket.off('disconnect');
            listenersInitialized.current = false;
        };
    }, []);

    useEffect(() => {
        setJoinedRooms([...roomRef.current]);
        const interval = setInterval(() => {
            setJoinedRooms(roomRef.current);
            const peers = {};
            for (const roomId of roomRef.current) {
                peers[roomId] = peerRef.current[roomId]
                    ? Object.keys(peerRef.current[roomId]).length
                    : 0;
            }
            setRoomPeers(peers);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const createPeerConnection = (roomId, peerId) => {
        const pc = new RTCPeerConnection(config);

        const dc = pc.createDataChannel('files');
        dc.onopen = () => {
            console.log('Data channel open');
            dataChannelRef.current[roomId] ??= {};
            dataChannelRef.current[roomId][peerId] = dc;
            registerDataChannel(roomId, peerId, dc);
        };

        pc.ondatachannel = (event) => {
            const dc2 = event.channel;
            console.log('Received data channel from peer:', peerId);
            registerDataChannel(roomId, peerId, dc2);
        };

        pc.onicecandidate = e => {
            if (e.candidate) {
                socket.emit('send-signal', {
                    to: peerId,
                    roomId: roomId,
                    signal: { candidate: e.candidate }
                });
            }
        };
        console.log(`[createPeerConnection] ${peerId} in ${roomId}`);

        return pc;
    };

    const saveRooms = (rooms) => {
        roomRef.current = rooms;
        setJoinedRooms(rooms);
        localStorage.setItem('joinedRooms', JSON.stringify(rooms));
    };

    const joinRoom = (roomId) => {
        socket.emit('join', roomId);
        if (roomRef.current.includes(roomId)) {
            console.warn(`Already in room ${roomId}, skipping join.`);
            return;
        }
        if (!roomRef.current.includes(roomId)) {
            roomRef.current = [...roomRef.current, roomId];
            saveRooms(roomRef.current);
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
        saveRooms(roomRef.current);
    };

    return (
        <P2PContext.Provider
            value={{
                roomRef,
                connection,
                joinedRooms,
                roomPeers,
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