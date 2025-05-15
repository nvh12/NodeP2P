import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const TransferContext = createContext();

export const useTransfer = () => useContext(TransferContext);

export const TransferProvider = ({ children }) => {
    const sendQueueRef = useRef([]);
    const sendingRef = useRef(false);
    const incomingTransferRef = useRef({});
    const receivedFiles = useRef([]);
    const dataChannelRef = useRef({});
    const [pendingTransfers, setPendingTransfers] = useState([]);
    const messageListeners = useRef({});

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const registerDataChannel = useCallback((roomId, peerId, channel) => {
        console.log('[TransferContext] registerDataChannel called:', { roomId, peerId, channel });
        const key = `${roomId}-${peerId}`;
        if (channel._setup) return;
        channel._setup = true;

        dataChannelRef.current[roomId] ??= {};
        dataChannelRef.current[roomId][peerId] = channel;

        channel.onmessage = async (e) => {
            if (typeof e.data === 'string') {
                const msg = JSON.parse(e.data);
                const listener = messageListeners.current?.[msg.type];
                if (listener) {
                    listener(msg, key);
                    return;
                }
                if (msg.type === 'file-offer') {
                    handleIncomingTransfer(msg, roomId, peerId);
                }
                if (msg.type === 'done') {
                    const transfer = incomingTransferRef.current[key];
                    if (transfer?.writable) {
                        try {
                            await transfer.writable.close();
                            console.log(`File "${transfer.fileName}" saved successfully (${transfer.receivedChunks}/${transfer.totalChunks} chunks)`);
                        } catch (err) {
                            console.error('Error closing writable:', err);
                        }
                    } else {
                        console.warn('No writable found on done');
                    }
                    delete incomingTransferRef.current[key];
                }
            } else if (e.data instanceof ArrayBuffer) {
                const transfer = incomingTransferRef.current[key];
                if (!transfer) {
                    console.warn(`Chunk received for unknown transfer: ${key}`);
                    return;
                }

                if (!transfer.writable) {
                    console.warn(`Writable not ready yet for: ${key}, retrying...`);
                    return;
                }
                try {
                    await transfer.writable.write(e.data);
                    transfer.receivedChunks += 1;
                    console.log(`Received chunk ${transfer.receivedChunks}/${transfer.totalChunks} for ${transfer.fileName}`);
                } catch (err) {
                    console.error('Error writing chunk:', err);
                }
            } else {
                console.warn('Unknown message type received:', e.data);
            };
        }

        channel.onclose = () => {
            delete incomingTransferRef.current[`${roomId}-${peerId}`];
        };
    }, []);

    const sendFile = ({ file, roomId, peerId }) => {
        sendQueueRef.current.push({ file, roomId, peerId });
        processQueue();
    }

    const processQueue = async () => {
        if (sendingRef.current) return;
        const next = sendQueueRef.current.shift();
        if (!next) return;

        sendingRef.current = true;
        const { file, roomId, peerId } = next;

        const channel = dataChannelRef.current?.[roomId]?.[peerId];
        if (!channel || channel.readyState !== 'open') {
            console.error('Channel not ready');
            sendingRef.current = false;
            return processQueue();
        }

        const chunkSize = 64 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);

        channel.send(JSON.stringify({
            type: 'file-offer',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks
        }));

        const waitForAccept = () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    delete messageListeners.current['file-accept'];
                    reject('Timeout waiting for file-accept');
                }, 15000);

                messageListeners.current['file-accept'] = () => {
                    clearTimeout(timeout);
                    delete messageListeners.current['file-accept'];
                    resolve();
                };
            });
        };

        try {
            await waitForAccept();
            console.log('File transfer accepted');
        } catch (e) {
            console.error(e);
            sendingRef.current = false;
            return processQueue();
        }

        let offset = 0;
        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            if (chunk.size === 0) {
                console.warn('Empty chunk encountered');
                break;
            }
            const buffer = await chunk.arrayBuffer();
            try {
                channel.send(buffer);
            } catch (err) {
                console.error('Error sending chunk:', err);
                break;
            }
            offset += chunkSize;
            console.log(`Sent chunk ${Math.ceil(offset / chunkSize)}/${totalChunks}`);
            if (offset >= file.size) break;
            await delay(5);
        }

        channel.send(JSON.stringify({ type: 'done', name: file.name }));
        sendingRef.current = false;
        processQueue();
    };

    const handleIncomingTransfer = async (transferMeta, roomId, peerId) => {
        const { fileName, fileType, fileSize, totalChunks } = transferMeta;
        const chunks = [];

        const key = `${roomId}-${peerId}`;

        setPendingTransfers(prev => [...prev, { meta: transferMeta, roomId, peerId }]);
    };

    return (
        <TransferContext.Provider
            value={{
                sendFile,
                receivedFiles: receivedFiles.current,
                registerDataChannel,
                dataChannelRef
            }}
        >
            {pendingTransfers.map((transfer, i) => {
                const { meta, roomId, peerId } = transfer;
                const accept = async () => {
                    const key = `${roomId}-${peerId}`;
                    const { fileName, fileType, fileSize, totalChunks } = meta;
                    const ext = fileName.split('.').pop();

                    let handle;
                    try {
                        handle = await window.showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{
                                description: fileType,
                                accept: { [fileType]: [`.${ext}`] }
                            }]
                        });
                    } catch (error) {
                        console.warn('User cancelled save picker');
                        setPendingTransfers(prev => prev.filter((_, j) => j !== i));
                        return;
                    }

                    const writable = await handle.createWritable();

                    incomingTransferRef.current[key] = {
                        fileName,
                        fileType,
                        fileSize,
                        totalChunks,
                        receivedChunks: 0,
                        writable
                    };

                    const channel = dataChannelRef.current?.[roomId]?.[peerId];
                    channel?.send(JSON.stringify({ type: 'file-accept' }));

                    setPendingTransfers(prev => prev.filter((_, j) => j !== i));
                };

                const decline = () => {
                    setPendingTransfers(prev => prev.filter((_, j) => j !== i));
                };

                return (
                    <div key={i} style={{ position: 'fixed', bottom: 20 + i * 80, right: 20, background: '#fff', padding: 10, border: '1px solid #ccc' }}>
                        <p>
                            Incoming file: <strong>{meta.fileName}</strong> ({(meta.fileSize / 1024).toFixed(2)} KB)
                        </p>
                        <button onClick={accept}>Accept</button>
                        <button onClick={decline}>Decline</button>
                    </div>
                );
            })}
            {children}
        </TransferContext.Provider>
    );
}