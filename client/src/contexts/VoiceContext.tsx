import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { getIceServers, getPeerConnectionOptions } from '../utils/api';

interface VoiceContextType {
  peer: any | null;
  myStream: MediaStream | null;
  setMyStream: (stream: MediaStream | null) => void;
  isPushingToTalk: boolean;
  setIsPushingToTalk: (is: boolean) => void;
  remoteStreams: Map<string, MediaStream>;
}

const VoiceContext = createContext<VoiceContextType>({
  peer: null,
  myStream: null,
  setMyStream: () => {},
  isPushingToTalk: false,
  setIsPushingToTalk: () => {},
  remoteStreams: new Map(),
});

export const useVoice = () => useContext(VoiceContext);

// Global reference to Peer class to avoid re-importing
let PeerClass: any = null;

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [peer, setPeer] = useState<any | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [isPushingToTalk, setIsPushingToTalk] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const activeCalls = useRef<Map<string, any>>(new Map());
  const myStreamRef = useRef<MediaStream | null>(null);

  // Đồng bộ myStream state vào ref
  useEffect(() => {
    myStreamRef.current = myStream;
    // Khi myStream thay đổi, cập nhật trạng thái mute của track
    if (myStream) {
      myStream.getAudioTracks().forEach(track => {
        track.enabled = isPushingToTalk;
      });
    }
  }, [myStream, isPushingToTalk]);

  // Hàm để thực hiện cuộc gọi và lưu vào ref
  const makeCall = (remotePeerId: string, stream: MediaStream) => {
    if (!peer) return;
    console.log('Initiating call to:', remotePeerId);
    const call = peer.call(remotePeerId, stream);
    
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('Received remote stream from (outgoing call):', remotePeerId);
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(remotePeerId, remoteStream);
        return next;
      });
    });

    call.on('error', (err: any) => {
      console.error('Call error with:', remotePeerId, err);
    });

    activeCalls.current.set(remotePeerId, call);
  };

  useEffect(() => {
    if (!socket || !user || !socket.id) return;

    let isMounted = true;
    let activePeer: any | null = null;

    const initPeer = async () => {
      try {
        if (!PeerClass) {
          try {
            const m = await import('peerjs');
            PeerClass = m.default || m.Peer || m;
          } catch (e) {
            console.error('PeerJS dynamic import failed:', e);
            return;
          }
        }

        if (!PeerClass) return;

        const peerConnectionOptions = getPeerConnectionOptions();
        const newPeer = new PeerClass(`peer-${socket.id}`, {
          ...peerConnectionOptions,
          debug: 1,
          config: {
            iceServers: getIceServers()
          }
        });
        activePeer = newPeer;

        newPeer.on('open', (id: string) => {
          console.log('PeerJS connected with ID:', id);
        });

        newPeer.on('error', (err: any) => {
          console.error('PeerJS error:', err);
        });

        newPeer.on('call', (call: any) => {
          console.log('Receiving call from:', call.peer);
          
          // QUAN TRỌNG: Luôn trả lời cuộc gọi ngay cả khi myStream chưa có
          // để thiết lập kết nối nhận âm thanh từ người gọi
          call.answer(myStreamRef.current || undefined);
          
          call.on('stream', (remoteStream: MediaStream) => {
            console.log('Received remote stream from (incoming call):', call.peer);
            setRemoteStreams(prev => {
              const next = new Map(prev);
              next.set(call.peer, remoteStream);
              return next;
            });
          });

          activeCalls.current.set(call.peer, call);
        });

        if (isMounted) {
          setPeer(newPeer);
        } else {
          newPeer.destroy();
        }
      } catch (err) {
        console.error('Failed to initialize PeerJS:', err);
      }
    };

    initPeer();

    return () => {
      isMounted = false;
      if (activePeer) {
        activePeer.destroy();
      }
    };
  }, [socket?.id, user?.id]);

  return (
    <VoiceContext.Provider value={{ 
      peer, 
      myStream, 
      setMyStream, 
      isPushingToTalk, 
      setIsPushingToTalk,
      remoteStreams,
      // @ts-ignore - Exporting internal helper for ClassCanvas
      makeCall 
    }}>
      {children}
    </VoiceContext.Provider>
  );
};
