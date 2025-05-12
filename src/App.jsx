import { BrowserRouter, Routes, Route } from 'react-router-dom';
import io from 'socket.io-client';
import { P2PProvider } from './contexts/P2PContext';
import Home from './pages/Home';
import Room from './pages/Room';

const socket = io('http://localhost:5000');
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function App() {
  return (
    <P2PProvider  socket={socket} config={config}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/room/:id' element={<Room />} />
        </Routes>
      </BrowserRouter>
    </P2PProvider>
  )
}

export default App;
