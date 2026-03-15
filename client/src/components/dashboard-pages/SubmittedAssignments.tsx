import React from 'react';

const SubmittedAssignments: React.FC = () => {
  const assignments = [
    { id: 1, title: 'Bài tập 📝 OOP - Kế thừa', class: 'CNTT01', date: '15/03/2026', grade: '8.5/10', status: 'Đã chấm' },
    { id: 2, title: 'Thực hành React Hooks', class: 'Web nâng cao', date: '14/03/2026', grade: 'Chờ chấm', status: 'Đã nộp' },
    { id: 3, title: 'Bài tập 📝 CSDL - Query', class: 'KTPM', date: '10/03/2026', grade: '9.0/10', status: 'Đã chấm' },
  ];

  return (
    <div className="panel-card">
      <div className="section-header">
        <h2>📋 Danh sách bài đã nộp</h2>
      </div>
      <div className="task-list">
        {assignments.map(item => (
          <div key={item.id} className="task-item">
            <div className="task-content">
              <h4>{item.title}</h4>
              <span className="task-class">📚 {item.class} - Ngày nộp: {item.date}</span>
            </div>
            <div className="task-meta">
              <span className={`status ${item.status === 'Đã chấm' ? 'ongoing' : 'pending'}`}>
                {item.grade}
              </span>
              <div className={`priority-badge ${item.status === 'Đã chấm' ? 'low' : 'medium'}`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubmittedAssignments;
