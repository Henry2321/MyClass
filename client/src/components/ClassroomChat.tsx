import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  type: 'system' | 'user'
}

interface ClassroomChatProps {
  isVisible: boolean
  onToggle: () => void
  classId: string
}

const BAD_WORDS = [
  'đụ', 'địt', 'lồn', 'cặc', 'đéo', 'vãi', 'chó', 'mẹ mày', 'đmm', 'vcl', 'clm', 'dmm',
  'đm', 'dm', 'đmm', 'dmm', 'vcl', 'vkl', 'cl', 'cc', 'clgt', 'clm', 'chó', 'mẹ mày', 'bố mày',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'pussy', 'dick', 'cunt', 'slut', 'whore',
  'nigger', 'faggot', 'dickhead', 'motherfucker', 'son of a bitch', 'cock', 'tits', 'boobs',
  'địt mẹ', 'địt bố', 'lồn mẹ', 'lồn bố', 'cặc mẹ', 'cặc bố', 'đéo mẹ', 'đéo bố',
  'vãi mẹ', 'vãi bố', 'chó mẹ', 'chó bố', 'dm mẹ', 'dm bố', 'đm mẹ', 'đm bố',
  'dmm mẹ', 'dmm bố', 'vcl mẹ', 'vcl bố', 'clm mẹ', 'clm bố', 'cc mẹ', 'cc bố',
  'clgt mẹ', 'clgt bố', 'cl mẹ', 'cl bố', 'vkl mẹ', 'vkl bố'
]

function filterBadWords(text: string): { clean: string; blocked: boolean } {
  const lower = text.toLowerCase()
  for (const word of BAD_WORDS) {
    if (lower.includes(word)) return { clean: text, blocked: true }
  }
  return { clean: text, blocked: false }
}

export default function ClassroomChat({ isVisible, onToggle, classId }: ClassroomChatProps) {
  const { socket } = useSocket()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'Hệ thống',
      content: 'Chào mừng bạn đến với lớp học!',
      timestamp: '10:00',
      type: 'system'
    },
    {
      id: '2',
      sender: 'Admin',
      content: 'Chúc các bạn học tốt.',
      timestamp: '10:01',
      type: 'user'
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [blockedNotice, setBlockedNotice] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Lắng nghe tin nhắn mới từ server
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (message: Message) => {
      console.log('Received new message:', message)
      setMessages(prev => {
        // Kiểm tra xem message đã tồn tại chưa để tránh duplicate
        const exists = prev.some(m => m.id === message.id)
        if (exists) return prev
        return [...prev, message]
      })
    }

    socket.on('new_message', handleNewMessage)

    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [socket])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return

    const { blocked } = filterBadWords(newMessage.trim())
    if (blocked) {
      setBlockedNotice(true)
      setTimeout(() => setBlockedNotice(false), 3000)
      return
    }

    const message: Message = {
      id: Date.now().toString(),
      sender: user?.name || 'Anonymous',
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: 'user'
    }

    // Thêm vào local state ngay để hiển thị tức thì
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id)
      if (exists) return prev
      return [...prev, message]
    })

    // Broadcast cho các client khác qua socket
    socket.emit('send_message', { classId, message })
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isVisible) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={onToggle}
          style={{
            backgroundColor: '#4ade80',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            fontSize: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Mở chat"
        >
          💬
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      right: '0',
      width: '350px',
      height: '100vh',
      backgroundColor: '#1e293b',
      borderLeft: '1px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#4ade80',
            borderRadius: '50%'
          }} />
          <h3 style={{ 
            margin: 0, 
            color: 'white', 
            fontSize: '16px',
            fontWeight: '600'
          }}>
            Classroom Chat
          </h3>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#334155'
            e.currentTarget.style.color = 'white'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#94a3b8'
          }}
          title="Đóng chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((message) => (
          <div key={message.id} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: message.type === 'system' ? '#4ade80' : '#60a5fa'
              }}>
                {message.sender}
              </span>
              <span style={{
                fontSize: '10px',
                color: '#64748b'
              }}>
                {message.timestamp}
              </span>
            </div>
            <div style={{
              backgroundColor: message.type === 'system' ? '#065f46' : '#1e40af',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '12px',
              fontSize: '14px',
              lineHeight: '1.4',
              maxWidth: '85%',
              wordWrap: 'break-word'
            }}>
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #334155',
        backgroundColor: '#0f172a'
      }}>
        {blockedNotice && (
          <div style={{
            backgroundColor: '#7f1d1d',
            color: '#fca5a5',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            ⚠️ Tin nhắn chứa từ ngữ không phù hợp, vui lòng chỉnh sửa lại.
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            style={{
              flex: 1,
              backgroundColor: '#334155',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '10px 12px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              resize: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4ade80'}
            onBlur={(e) => e.target.style.borderColor = '#475569'}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            style={{
              backgroundColor: newMessage.trim() ? '#4ade80' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              height: '44px'
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}