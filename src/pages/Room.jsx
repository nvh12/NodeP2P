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
        <div className="max-w-xl mx-auto mt-8 p-6 rounded-2xl shadow-md space-y-6">
            <div>
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0 file:text-sm file:font-semibold
                 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
            </div>
            <div className="flex gap-4">
                <button onClick={handleLeave}>Leave Room</button>
                <button onClick={() => navigate('/')}>Home</button>
            </div>
            <div>
                <h4 className="text-lg font-semibold mb-2">Connected Peers:</h4>
                {peerList.length === 0 ? (
                    <p className="text-gray-400">No peers connected.</p>
                ) : (
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-200">
                        {peerList.map(peerId => (
                            <li key={peerId}>{peerId}</li>
                        ))}
                    </ul>
                )}
            </div>
            {file && <p className="text-sm text-green-400">Selected: {file.name}</p>}
            <button
                onClick={() => send()}
                disabled={!file || !hasOpenChannels}
                className={`w-full transition rounded-lg ${file && hasOpenChannels
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-gray-500 cursor-not-allowed'
                    }`}
            >
                Send File
            </button>
        </div>
    );
}

export default Room;