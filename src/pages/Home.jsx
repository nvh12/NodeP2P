import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useP2P } from '../contexts/P2PContext';
import { useTransfer } from '../contexts/TransferContext';

function Home() {
    const { joinedRooms, joinRoom, leaveRoom, roomPeers } = useP2P();
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    const handleJoin = () => {
        if (!roomId || joinedRooms.includes(roomId)) return;
        joinRoom(roomId);
    };

    const handleLeave = (id) => {
        leaveRoom(id);
    };

    useEffect(() => {}, [roomPeers]);

    return (
        <div>
            <div className='flex flex-col items-center justify-center min-h-screen space-y-6 px-4'>
                <h1 className='text-3xl font-bold'>P2P File Share</h1>
                <input
                    value={roomId}
                    onChange={e => setRoomId(e.target.value.trim())}
                    placeholder='Room ID'
                    className='w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-gray-300'
                />
                <button
                    onClick={handleJoin}
                    className='px-6 py-2 border rounded-lg hover:bg-gray-100 transition'
                >
                    Join
                </button>
                {joinedRooms.length > 0 && (
                    <div className='mt-6'>
                        <h2 className='text-lg font-semibold mb-2'>Joined Rooms:</h2>
                        <ul className='space-y-2'>
                            {joinedRooms.map((id) => (
                                <li key={id} className='flex items-center space-x-4'>
                                    <span
                                        onClick={() => navigate(`/room/${id}`)}
                                        className='cursor-pointer text-blue-600 hover:underline'
                                    >
                                        {id}
                                    </span>
                                    <span className='text-sm text-gray-500'>
                                        Peers: {roomPeers[id] ?? 0}
                                    </span>
                                    <button
                                        onClick={() => handleLeave(id)}
                                        className='text-red-600 hover:underline'
                                    >
                                        Leave
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;