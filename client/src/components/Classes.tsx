import { useState } from 'react';

export default function Classes() {
  const [classes] = useState([
    { id: 1, name: 'React Nâng cao', code: 'REACT01', students: 25, teacher: 'Nguyễn Văn A' },
    { id: 2, name: 'Node.js Backend', code: 'NODE01', students: 18, teacher: 'Trần Thị B' },
    { id: 3, name: 'Database Design', code: 'DB01', students: 30, teacher: 'Lê Văn C' }
  ]);

  return (
    <>
      <h1 className="title">Lớp học 📚</h1>
      
      <div className="classes-header">
        <button className="btn-primary">+ Tạo lớp mới</button>
        <button className="btn-secondary">Tham gia lớp</button>
      </div>

      <div className="classes-grid">
        {classes.map(cls => (
          <div key={cls.id} className="class-card">
            <div className="class-header">
              <h3>{cls.name}</h3>
              <span className="class-code">{cls.code}</span>
            </div>
            <div className="class-info">
              <p>👨‍🏫 {cls.teacher}</p>
              <p>👥 {cls.students} sinh viên</p>
            </div>
            <div className="class-actions">
              <button className="btn-outline">Xem chi tiết</button>
              <button className="btn-outline">Quản lý</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}