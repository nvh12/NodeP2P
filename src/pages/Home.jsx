import { useEffect, useState, useRef } from 'react';
import { useP2P } from '../contexts/P2PContext';

function Home({ socket, config }) {
    const { roomRef, joinRoom } = useP2P();
    return (
        <div>
            <div className="flex flex-col items-center justify-center min-h-screen space-y-6 px-4">
                <h1 className="text-3xl font-bold">P2P File Share</h1>

                <input
                    value={roomRef}
                    onChange={e => roomRef.current = roomRef.current = [...roomRef.current, e.target.value]}
                    placeholder="Room ID"
                    className="w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-gray-300"
                />

                <button
                    onClick={joinRoom}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition"
                >
                    Join
                </button>
            </div>

        </div>
    );
}

export default Home;