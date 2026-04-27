import React from 'react';

const Deadlines: React.FC = () => {
  const deadlines = [
    { id: 1, title: 'Bài tập 📝 OOP - Kế thừa', class: 'CNTT01', time: 'Hôm nay 23:59', priority: 'high' },
    { id: 2, title: 'Thực hành React Hooks', class: 'Web nâng cao', time: 'Còn 2 ngày', priority: 'medium' },
    { id: 3, title: 'Project cuối kỳ', class: 'Web nâng cao', time: 'Còn 2 tuần', priority: 'low' },
  ];

  return (
    <div className="panel-card">
      <div className="section-header">
        <h2>⏰ Deadline sắp tới</h2>
      </div>
      <div className="task-list">
        {deadlines.map(item => (
          <div key={item.id} className="task-item">
            <div className="task-content">
              <h4>{item.title}</h4>
              <span className="task-class">📚 {item.class}</span>
            </div>
            <div className="task-meta">
              <span className={`deadline ${item.priority}`}>
                {item.time}
              </span>
              <div className={`priority-badge ${item.priority}`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Deadlines;
