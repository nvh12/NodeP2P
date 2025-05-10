import { useState } from 'react'
import './App.css'

function App() {
  const [room, setRoom] = useState('');

  return (
    <div>
      <h1>P2P File Share</h1>
      <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room ID" />
      <button>Join</button>
    </div>
  );
}

export default App;
