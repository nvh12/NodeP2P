import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useP2P } from '../contexts/P2PContext';
import { useTransfer } from '../contexts/TransferContext';

function Room() {
    const [file, setFile] = useState(null);
    const [peerList, setPeerList] = useState([]);
    const { sendFile, dataChannelRef } = useTransfer();
    const { joinRoom, leaveRoom, peerRef } = useP2P();
    const { roomId } = useParams();
    const navigate = useNavigate();

    const hasOpenChannels =
        dataChannelRef.current[roomId] &&
        Object.values(dataChannelRef.current[roomId]).some(dc => dc.readyState === 'open');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const send = () => {
        if (!file) {
            console.error('No file');
            return;
        }

        const channels = dataChannelRef.current[roomId];
        if (!channels || Object.keys(channels).length === 0) {
            console.warn('No connected peers to send file to');
            return;
        }

        for (const peerId in dataChannelRef.current[roomId]) {
            sendFile({ file, roomId, peerId });
        }
    }

    const handleLeave = () => {
        leaveRoom(roomId);
        navigate('/');
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const peers = peerRef.current[roomId]
                ? Object.keys(peerRef.current[roomId])
                : [];

            setPeerList(prev =>
                JSON.stringify(prev) !== JSON.stringify(peers) ? peers : prev
            );
        }, 500);

        return () => clearInterval(interval);
    }, [roomId]);

    return (
        <div>
            <input type='file' onChange={handleFileChange} />
            <button onClick={handleLeave}>Leave Room</button>
            <button onClick={() => navigate('/')}>Home</button>
            <div>
                <h4>Connected Peers:</h4>
                {peerList.length === 0 ? (
                    <p>No peers connected.</p>
                ) : (
                    <ul>
                        {peerList.map(peerId => (
                            <li key={peerId}>{peerId}</li>
                        ))}
                    </ul>
                )}
            </div>
            {file && <p>Selected: {file.name}</p>}
            <button onClick={() => send()} disabled={!file || !hasOpenChannels}>Send File</button>
        </div>
    );
}

export default Room;