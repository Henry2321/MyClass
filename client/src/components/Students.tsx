import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';

interface Student {
  _id: string;
  name: string;
  email: string;
  className: string;
  createdAt: string;
  assignments: { completed: number; total: number } | undefined;
  avgScore: number | null;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiCall('/api/students');
        if (!res.ok) throw new Error('Không thể tải danh sách sinh viên');
        const data = await res.json();
        setStudents(data);
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const classes = [...new Set(students.map(s => s.className))];

  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.className === selectedClass);

  const avgScoreAll = students.length > 0
    ? Math.round(
        students.filter(s => s.avgScore != null).reduce((sum, s) => sum + (s.avgScore ?? 0), 0) /
        (students.filter(s => s.avgScore != null).length || 1)
      )
    : 0;

  const getScoreColor = (score: number | null) => {
    if (score == null) return 'gray';
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
            <span className="stat-number">{classes.length}</span>
            <span className="stat-label">Lớp học</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{avgScoreAll || '—'}</span>
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
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
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

        {loading && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
            Đang tải...
          </div>
        )}

        {error && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {!loading && !error && filteredStudents.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
            Chưa có sinh viên nào.
          </div>
        )}

        {filteredStudents.map(student => (
          <div key={student._id} className="table-row">
            <div className="col student-info">
              <div className="student-avatar">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="student-name">{student.name}</div>
                <div className="student-email">{student.email}</div>
              </div>
            </div>

            <div className="col">
              <span className="class-badge">{student.className}</span>
            </div>

            <div className="col">
              {(student.assignments?.total ?? 0) > 0 ? (
                <div className="assignment-progress">
                  <span>{student.assignments?.completed}/{student.assignments?.total}</span>
                  <div className="mini-progress">
                    <div
                      className="mini-progress-fill"
                      style={{
                        width: `${((student.assignments?.completed ?? 0) / (student.assignments?.total ?? 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có</span>
              )}
            </div>

            <div className="col">
              <span className={`score ${getScoreColor(student.avgScore)}`}>
                {student.avgScore ?? '—'}
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
