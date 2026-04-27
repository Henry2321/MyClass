import { useState } from 'react';

export default function Students() {
  const [students] = useState([
    {
      id: 1,
      name: 'Nguyễn Văn An',
      email: 'an.nguyen@email.com',
      class: 'React Nâng cao',
      joinDate: '2024-02-15',
      assignments: { completed: 8, total: 10 },
      avgScore: 85
    },
    {
      id: 2,
      name: 'Trần Thị Bình',
      email: 'binh.tran@email.com',
      class: 'Node.js Backend',
      joinDate: '2024-02-20',
      assignments: { completed: 6, total: 8 },
      avgScore: 92
    },
    {
      id: 3,
      name: 'Lê Văn Cường',
      email: 'cuong.le@email.com',
      class: 'Database Design',
      joinDate: '2024-02-10',
      assignments: { completed: 12, total: 12 },
      avgScore: 78
    },
    {
      id: 4,
      name: 'Phạm Thị Dung',
      email: 'dung.pham@email.com',
      class: 'React Nâng cao',
      joinDate: '2024-02-25',
      assignments: { completed: 7, total: 10 },
      avgScore: 88
    }
  ]);

  const [selectedClass, setSelectedClass] = useState('all');

  const filteredStudents = selectedClass === 'all' 
    ? students 
    : students.filter(student => student.class === selectedClass);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 80) return 'orange';
    return 'red';
  };

  return (
    <>
      <h1 className="title">Sinh viên 👥</h1>
      
      <div className="students-header">
        <div className="students-stats">
          <div className="stat-item">
            <span className="stat-number">{students.length}</span>
            <span className="stat-label">Tổng sinh viên</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">3</span>
            <span className="stat-label">Lớp học</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length)}
            </span>
            <span className="stat-label">Điểm TB</span>
          </div>
        </div>
        
        <div className="students-filters">
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="class-filter"
          >
            <option value="all">Tất cả lớp</option>
            <option value="React Nâng cao">React Nâng cao</option>
            <option value="Node.js Backend">Node.js Backend</option>
            <option value="Database Design">Database Design</option>
          </select>
        </div>
      </div>

      <div className="students-table">
        <div className="table-header">
          <div className="col">Sinh viên</div>
          <div className="col">Lớp học</div>
          <div className="col">Bài tập</div>
          <div className="col">Điểm TB</div>
          <div className="col">Thao tác</div>
        </div>
        
        {filteredStudents.map(student => (
          <div key={student.id} className="table-row">
            <div className="col student-info">
              <div className="student-avatar">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="student-name">{student.name}</div>
                <div className="student-email">{student.email}</div>
              </div>
            </div>
            
            <div className="col">
              <span className="class-badge">{student.class}</span>
            </div>
            
            <div className="col">
              <div className="assignment-progress">
                <span>{student.assignments.completed}/{student.assignments.total}</span>
                <div className="mini-progress">
                  <div 
                    className="mini-progress-fill"
                    style={{ 
                      width: `${(student.assignments.completed / student.assignments.total) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="col">
              <span className={`score ${getScoreColor(student.avgScore)}`}>
                {student.avgScore}
              </span>
            </div>
            
            <div className="col">
              <button className="btn-outline small">Xem chi tiết</button>
              <button className="btn-outline small">Nhắn tin</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}