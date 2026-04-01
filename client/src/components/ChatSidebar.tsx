import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  user: string;
  text: string;
  time: string;
  isMe: boolean;
}

export default function ChatSidebar() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', user: 'Hệ thống', text: 'Chào mừng bạn đến với lớp học!', time: '10:00', isMe: false },
    { id: '2', user: 'Admin', text: 'Chúc các bạn học tốt.', time: '10:01', isMe: false },
  ]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (msg: any) => {
      // Avoid adding our own message again if it's already added in handleSend
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, isMe: msg.userId === user?.id }];
      });
    });

    return () => {
      socket.off('new_message');
    };
  }, [socket, user?.id]);

  const handleSend = () => {
    if (!inputValue.trim() || !socket) return;
    
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      userId: user?.id,
      user: user?.name || 'Bạn',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    // Emit to server
    socket.emit('send_message', {
      classId: 'main-class',
      message: newMessage
    });

    // Add locally for instant feedback
    setMessages(prev => [...prev, { ...newMessage, isMe: true }]);
    setInputValue('');
  };

  return (
    <div style={{
      width: '350px',
      height: '100%',
      backgroundColor: '#1a1b26',
      borderLeft: '1px solid #2d2e3e',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #2d2e3e',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#4ade80'
      }}>
        💬 Classroom Chat
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{
            alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '4px',
              textAlign: msg.isMe ? 'right' : 'left'
            }}>
              {msg.user} • {msg.time}
            </div>
            <div style={{
              backgroundColor: msg.isMe ? '#4ade80' : '#2d2e3e',
              color: msg.isMe ? '#1a1b26' : 'white',
              padding: '10px 14px',
              borderRadius: '12px',
              borderTopRightRadius: msg.isMe ? '2px' : '12px',
              borderTopLeftRadius: msg.isMe ? '12px' : '2px',
              fontSize: '14px',
              wordBreak: 'break-word'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #2d2e3e',
        display: 'flex',
        gap: '10px'
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Nhập tin nhắn..."
          style={{
            flex: 1,
            backgroundColor: '#242533',
            border: '1px solid #4a4d63',
            borderRadius: '8px',
            padding: '10px 14px',
            color: 'white',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSend}
          style={{
            backgroundColor: '#4ade80',
            color: '#1a1b26',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
