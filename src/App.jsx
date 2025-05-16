import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import io from 'socket.io-client';
import { P2PProvider } from './contexts/P2PContext';
import Home from './pages/Home';
import Room from './pages/Room';
import { TransferProvider } from './contexts/TransferContext';

const socket = io(import.meta.env.VITE_SERVER_URL);
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function App() {
  return (
    <TransferProvider>
      <P2PProvider socket={socket} config={config}>
        <Router>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/room/:roomId' element={<Room />} />
          </Routes>
        </Router>
      </P2PProvider>
    </TransferProvider>
  )
}

export default App;
