import { createContext, useContext } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_SOCKET_URL || "http://localhost:3000";

// Initialize the socket instance outside of the component
const socket = io(SOCKET_URL, { withCredentials: true });

const SocketContext = createContext(socket);

const useSocket = () => {
  return useContext(SocketContext);
};

const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketProvider, useSocket };