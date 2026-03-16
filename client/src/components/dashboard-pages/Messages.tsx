import React from 'react';

const Messages: React.FC = () => {
  const messages = [
    { id: 1, sender: 'GV. Nguyễn Văn A', content: 'Chào em, bài tập OOP của em làm rất tốt...', time: '10:30 Hôm nay', unread: true },
    { id: 2, sender: 'GV. Trần Thị B', content: 'Em nhớ nộp bài thực hành đúng hạn nhé.', time: 'Hôm qua', unread: false },
    { id: 3, sender: 'GV. Lê Văn C', content: 'Lịch học bù tuần sau sẽ dời sang thứ 5.', time: '2 ngày trước', unread: false },
  ];

  return (
    <div className="panel-card">
      <div className="section-header">
        <h2>💬 Tin nhắn với Giảng viên</h2>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>➕ Soạn tin mới</button>
      </div>
      <div className="activity-list" style={{ marginTop: '20px' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`activity-item ${msg.unread ? 'urgent' : ''}`} style={{ cursor: 'pointer' }}>
            <div className="activity-icon">
              {msg.unread ? '📩' : '📨'}
            </div>
            <div className="activity-content">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '15px' }}>{msg.sender}</h4>
                <span className="activity-time">{msg.time}</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Messages;
