import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface VideoMeetingProps {
  classData: any;
  onLeave: () => void;
}

interface Participant {
  id: string;
  name: string;
  isTeacher: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isPresenting: boolean;
}

export default function VideoMeeting({ classData, onLeave }: VideoMeetingProps) {
  const { user } = useAuth();
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: '1',
      name: classData.teacher.name,
      isTeacher: true,
      videoEnabled: true,
      audioEnabled: true,
      isPresenting: false
    },
    {
      id: '2',
      name: user?.name || 'Bạn',
      isTeacher: user?.role === 'teacher',
      videoEnabled: false,
      audioEnabled: false,
      isPresenting: false
    }
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const joinMessage = {
      id: Date.now(),
      user: 'Hệ thống',
      message: `${user?.name} đã tham gia lớp học`,
      time: new Date().toLocaleTimeString(),
      isSystem: true
    };
    setChatMessages([joinMessage]);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Xử lý khi stream thay đổi
  useEffect(() => {
    if (stream && videoRef.current && isVideoEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, isVideoEnabled]);

  const toggleVideo = async () => {
    try {
      if (!isVideoEnabled) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: isAudioEnabled 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Đảm bảo video được play
          await videoRef.current.play();
        }
      } else {
        if (stream) {
          stream.getVideoTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setStream(null);
      }
      setIsVideoEnabled(!isVideoEnabled);
      
      setParticipants(prev => prev.map(p => 
        p.id === '2' ? { ...p, videoEnabled: !isVideoEnabled } : p
      ));
    } catch (error) {
      console.error('Lỗi camera:', error);
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const toggleAudio = async () => {
    try {
      if (!isAudioEnabled && !stream) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: isVideoEnabled, 
          audio: true 
        });
        setStream(mediaStream);
      }
      
      if (stream) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = !isAudioEnabled;
        });
      }
      
      setIsAudioEnabled(!isAudioEnabled);
      
      setParticipants(prev => prev.map(p => 
        p.id === '2' ? { ...p, audioEnabled: !isAudioEnabled } : p
      ));
    } catch (error) {
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: Date.now(),
        user: user?.name || 'Bạn',
        message: chatMessage,
        time: new Date().toLocaleTimeString(),
        isSystem: false
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatMessage('');
    }
  };

  return (
    <div className="video-meeting">
      <div className="meeting-header">
        <div className="meeting-info">
          <h2>{classData.name}</h2>
          <span className="meeting-code">Mã lớp: {classData.code}</span>
        </div>
        <div className="meeting-time">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="meeting-content">
        <div className={`video-grid ${showChat ? 'with-chat' : ''}`}>
          {participants.map(participant => (
            <div 
              key={participant.id} 
              className={`video-tile ${participant.isPresenting ? 'presenting' : ''}`}
            >
              <div className="video-container">
                {participant.id === '2' && isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="participant-video"
                  />
                ) : (
                  <div className="video-placeholder">
                    <div className="avatar-large">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                
                <div className="participant-info">
                  <span className="participant-name">
                    {participant.name}
                    {participant.isTeacher && ' 👨'}
                    {participant.id === '2' && ' (Bạn)'}
                  </span>
                  <div className="participant-status">
                    {!participant.videoEnabled && (
                      <span className="status-icon video-off"></span>
                    )}
                    {!participant.audioEnabled && (
                      <span className="status-icon audio-off"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showChat && (
          <div className="chat-panel">
            <div className="chat-header">
              <h3>💬 Trò chuyện</h3>
              <button 
                className="close-chat"
                onClick={() => setShowChat(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="chat-messages">
              {chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`chat-message ${msg.isSystem ? 'system' : ''}`}
                >
                  <div className="message-header">
                    <strong>{msg.user}</strong>
                    <span className="message-time">{msg.time}</span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              ))}
            </div>
            
            <div className="chat-input">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Gửi</button>
            </div>
          </div>
        )}
      </div>

      <div className="meeting-controls">
        <div className="control-group">
          <button 
            className={`control-btn ${isAudioEnabled ? 'active' : 'inactive'}`}
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Tắt mic' : 'Bật mic'}
          >
            {isAudioEnabled ? '' : ''}
          </button>
          
          <button 
            className={`control-btn ${isVideoEnabled ? 'active' : 'inactive'}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
          >
            {isVideoEnabled ? '' : ''}
          </button>
          
          <button 
            className="control-btn"
            onClick={() => setShowChat(!showChat)}
            title="💬 Trò chuyện"
          >
            </button>
        </div>
        
        <div className="control-group">
          <button 
            className="control-btn participants"
            title="Danh sách người tham gia"
          >
            {participants.length}
          </button>
          
          <button 
            className="control-btn leave"
            onClick={onLeave}
            title="📞 Rời khỏi lớp học"
          >
            📞 Rời khỏi
          </button>
        </div>
      </div>
    </div>
  );
}