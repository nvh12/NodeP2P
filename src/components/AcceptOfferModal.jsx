export default function AcceptOfferModal({ offer, onAccept, onDecline }) {
    const { meta } = offer;
    return (
        <div className="modal">
            <p>Accept file: {meta.fileName} ({(meta.fileSize / 1024).toFixed(2)} KB)?</p>
            <button onClick={() => onAccept(offer)}>Yes</button>
            <button onClick={() => onDecline(offer)}>No</button>
        </div>
    );
}
