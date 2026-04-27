import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_PATH, SOCKET_URL } from '../utils/api';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketOptions = {
        path: SOCKET_PATH,
        withCredentials: true,
        transports: ['polling'], // Chỉ dùng polling
        timeout: 30000, // Tăng timeout
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        upgrade: false // Tắt upgrade để tránh WebSocket issues
      };

      const connectionTarget = SOCKET_URL || `${window.location.origin}${SOCKET_PATH}`;
      console.log('Connecting to socket server:', connectionTarget);

      // #region agent log
      fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H4',location:'client/src/contexts/SocketContext.tsx:38',message:'socket connect attempt',data:{hasSocketUrl:!!SOCKET_URL,socketUrlConfigured:SOCKET_URL||null,socketPath:SOCKET_PATH,connectionTarget},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const newSocket = SOCKET_URL
        ? io(SOCKET_URL, socketOptions)
        : io(socketOptions);

      newSocket.on('connect', () => {
        console.log('Connected to socket server');

        // #region agent log
        fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H4',location:'client/src/contexts/SocketContext.tsx:47',message:'socket connected',data:{socketId:newSocket.id,joinedUserId:user.id},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        setIsConnected(true);
        newSocket.emit('join', user.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from socket server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);

        // #region agent log
        fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H4',location:'client/src/contexts/SocketContext.tsx:55',message:'socket connect_error',data:{errorName:(error && (error as any).name)||'unknown',errorMessage:(error && (error as any).message)||''},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
