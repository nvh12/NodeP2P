import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useP2P } from "../contexts/P2PContext";

function Room() {
    const [file, setFile] = useState(null);
    const { peerRef, dataChannelRef } = useP2P();
    const { id } = useParams();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const sendFile = () => {
        if (!file || !dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            console.warn('No file or data channel not open');
            return;
        }

        const chunkSize = 64 * 1024;
        const reader = new FileReader();
        let offset = 0;

        reader.onload = (e) => {
            dataChannelRef.current.send(e.target.result);
            offset += e.target.result.byteLength;
        }

        if (offset < file.size) {
            readChunk(offset);
        } else {
            console.log('File sent');
            dataChannelRef.current.send(JSON.stringify({ done: true, name: file.name}));
        }
    };

    const readChunk = (o) => {
        const chunk = file.slice(o, o + chunkSize);
        reader.readAsArrayBuffer(slice);
    }
    
    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <button onClick={sendFile}>Send File</button>
        </div>
    )
}

export default Room;