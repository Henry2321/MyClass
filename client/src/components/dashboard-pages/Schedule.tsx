import React from 'react';

const Schedule: React.FC = () => {
  const schedule = [
    { id: 1, time: '08:00 - 10:00', subject: 'Lập trình hướng đối tượng', room: 'Phòng 402', status: 'Đã kết thúc' },
    { id: 2, time: '10:00 - 12:00', subject: 'Lập trình Web nâng cao', room: 'Phòng 501', status: 'Đang diễn ra' },
    { id: 3, time: '13:00 - 15:00', subject: 'Cơ sở dữ liệu', room: 'Phòng 302', status: 'Sắp tới' },
    { id: 4, time: '15:00 - 17:00', subject: 'Kỹ thuật phần mềm', room: 'Phòng 201', status: 'Sắp tới' },
  ];

  return (
    <div className="panel-card">
      <div className="section-header">
        <h2>📅 Lịch học trong ngày</h2>
        <div className="subtitle">Thứ Hai, ngày 15 tháng 3, 2026</div>
      </div>
      <div className="schedule-list" style={{ marginTop: '20px' }}>
        {schedule.map(item => (
          <div key={item.id} className={`schedule-item ${item.status === 'Đang diễn ra' ? 'current' : ''}`}>
            <div className="time">{item.time.split(' - ')[0]}</div>
            <div className="event">
              <span className="event-title">{item.subject}</span>
              <span className="event-class">{item.room}</span>
            </div>
            <div className={`status ${
              item.status === 'Đang diễn ra' ? 'ongoing' : 
              item.status === 'Sắp tới' ? 'upcoming' : 'pending'
            }`}>
              {item.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schedule;
