import React from 'react';

const Grades: React.FC = () => {
  const grades = [
    { id: 1, subject: 'Lập trình hướng đối tượng', code: 'CNTT01', grade: 8.5, credits: 3 },
    { id: 2, 'subject': 'Lập trình Web nâng cao', code: 'WEB02', grade: 9.0, credits: 3 },
    { id: 3, 'subject': 'Cơ sở dữ liệu', code: 'CSDL01', grade: 8.0, credits: 3 },
    { id: 4, 'subject': 'Kỹ thuật phần mềm', code: 'KTPM01', grade: 7.5, credits: 3 },
  ];

  return (
    <div className="panel-card">
      <div className="section-header">
        <h2>📊 Bảng điểm cá nhân</h2>
      </div>
      <div className="student-list" style={{ marginTop: '20px' }}>
        {grades.map(item => (
          <div key={item.id} className="student-item">
            <div className="student-info">
              <div className="student-avatar" style={{ background: '#8b5cf6' }}>{item.grade}</div>
              <div>
                <h4>{item.subject}</h4>
                <p>Mã học phần: {item.code} | Số tín chỉ: {item.credits}</p>
              </div>
            </div>
            <div className="student-stats">
              <span className="status ongoing">Đã hoàn thành</span>
            </div>
          </div>
        ))}
      </div>
      <div className="progress-section" style={{ marginTop: '24px' }}>
        <h3>📈 Tiến độ hoàn thành chương trình</h3>
        <div className="progress-item">
          <span>Tín chỉ tích lũy: 45/120</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '37.5%' }}></div>
          </div>
          <span>37.5%</span>
        </div>
      </div>
    </div>
  );
};

export default Grades;
