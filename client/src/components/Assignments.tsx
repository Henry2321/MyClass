import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  files: string[];
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late';
}

interface Assignment {
  id: number;
  title: string;
  class: string;
  dueDate: string;
  description: string;
  maxGrade: number;
  submissions: Submission[];
  totalStudents: number;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
  attachments: string[];
}

export default function Assignments() {
  const { user } = useAuth();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [assignmentsList, setAssignmentsList] = useState<Assignment[]>([
    {
      id: 1,
      title: 'Bài tập 📝 React Hooks',
      class: 'React Nâng cao',
      dueDate: '2024-03-20',
      description: 'Thực hành sử dụng useState, useEffect và custom hooks trong React',
      maxGrade: 10,
      totalStudents: 25,
      status: 'active',
      createdAt: '2024-03-10',
      attachments: ['react-hooks-template.zip', 'requirements.pdf'],
      submissions: [
        {
          id: '1',
          studentName: 'Nguyễn Văn A',
          studentEmail: 'nguyenvana@email.com',
          submittedAt: '2024-03-18 14:30',
          files: ['hooks-assignment.zip'],
          grade: 8.5,
          feedback: 'Bài làm tốt, cần cải thiện error handling',
          status: 'graded'
        },
        {
          id: '2',
          studentName: 'Trần Thị B',
          studentEmail: 'tranthib@email.com',
          submittedAt: '2024-03-19 09:15',
          files: ['react-hooks-project.zip'],
          status: 'submitted'
        }
      ]
    },
    {
      id: 2,
      title: 'Xây dựng API với Express',
      class: 'Node.js Backend',
      dueDate: '2024-03-25',
      description: 'Tạo RESTful API với Express.js, MongoDB và JWT authentication',
      maxGrade: 10,
      totalStudents: 18,
      status: 'active',
      createdAt: '2024-03-12',
      attachments: ['api-starter.zip', 'database-schema.sql'],
      submissions: [
        {
          id: '3',
          studentName: 'Lê Văn C',
          studentEmail: 'levanc@email.com',
          submittedAt: '2024-03-20 16:45',
          files: ['express-api.zip', 'documentation.md'],
          grade: 9.0,
          feedback: 'Excellent work! Clean code and good documentation',
          status: 'graded'
        }
      ]
    },
    {
      id: 3,
      title: 'Thiết kế Database',
      class: 'Database Design',
      dueDate: '2024-03-18',
      description: 'Thiết kế ERD và implement database cho hệ thống quản lý thư viện',
      maxGrade: 10,
      totalStudents: 30,
      status: 'completed',
      createdAt: '2024-03-05',
      attachments: ['database-requirements.pdf', 'sample-data.sql'],
      submissions: []
    }
  ]);

  const handleQuickAction = (action: string) => {
    setShowQuickActions(false);
    
    switch(action) {
      case 'create-assignment':
        setShowCreateModal(true);
        break;
      case 'grade-submissions':
        alert('Chức năng chấm điểm hàng loạt đang được phát triển');
        break;
      case 'export-grades':
        alert('Chức năng xuất điểm đang được phát triển');
        break;
      case 'view-analytics':
        alert('Chức năng phân tích đang được phát triển');
        break;
      case 'settings':
        alert('Chức năng cài đặt đang được phát triển');
        break;
    }
  };

  const handleViewSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowEditModal(true);
  };

  const handleGradeAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowGradingModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'orange';
      case 'completed': return 'green';
      case 'draft': return 'blue';
      default: return 'gray';
    }
  };

  const getDaysLeft = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Đã hết hạn';
    if (diffDays === 0) return 'Hôm nay';
    return `Còn ${diffDays} ngày`;
  };

  const handleGradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    if (selectedAssignment) {
      const updatedAssignment = {
        ...selectedAssignment,
        submissions: selectedAssignment.submissions.map(submission =>
          submission.id === submissionId
            ? { ...submission, grade, feedback, status: 'graded' as const }
            : submission
        )
      };
      
      setAssignmentsList(prev => prev.map(assignment => 
        assignment.id === selectedAssignment.id ? updatedAssignment : assignment
      ));
      setSelectedAssignment(updatedAssignment);
      alert('📊 Chấm điểm thành công!');
    }
  };

  const getSubmissionStats = (assignment: Assignment) => {
    const submitted = assignment.submissions.length;
    const graded = assignment.submissions.filter(s => s.status === 'graded').length;
    return { submitted, graded, total: assignment.totalStudents };
  };

  const filteredAssignments = assignmentsList.filter(assignment => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return assignment.status === 'active';
    if (filterStatus === 'completed') return assignment.status === 'completed';
    if (filterStatus === 'draft') return assignment.status === 'draft';
    return true;
  });

  return (
    <>
      {user?.role === 'teacher' ? (
        // Giao diện cho giáo viên
        <>
          <div className="assignments-header-main">
            <div className="assignments-title-section">
              <h1 className="title">Bài tập 📝 </h1>
              <p className="subtitle">Quản lý và chấm điểm bài tập của sinh viên</p>
            </div>
            
            <div className="header-actions">
              <button 
                className="quick-action-btn"
                onClick={() => setShowQuickActions(!showQuickActions)}
              >
                ⚡ Thao tác nhanh
              </button>
              {showQuickActions && (
                <div className="quick-actions-dropdown">
                  <button onClick={() => handleQuickAction('create-assignment')}>📝 ➕ Tạo bài tập mới</button>
                  <button onClick={() => handleQuickAction('grade-submissions')}>📊 📊 Chấm điểm hàng loạt</button>
                  <button onClick={() => handleQuickAction('export-grades')}>📤 Xuất bảng điểm</button>
                  <button onClick={() => handleQuickAction('view-analytics')}>📈 Xem thống kê</button>
                  <button onClick={() => handleQuickAction('settings')}>⚙️ Cài đặt ⚙️</button>
                </div>
              )}
            </div>
          </div>
          
          <div className="assignments-controls">
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ 📝 Tạo bài tập</button>
            <div className="filter-tabs">
              <button 
                className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Tất cả ({assignmentsList.length})
              </button>
              <button 
                className={`tab ${filterStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                🟡 Đang mở ({assignmentsList.filter(a => a.status === 'active').length})
              </button>
              <button 
                className={`tab ${filterStatus === 'completed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('completed')}
              >
                ✅ Đã đóng ({assignmentsList.filter(a => a.status === 'completed').length})
              </button>
            </div>
          </div>

          <div className="assignments-grid">
            {filteredAssignments.map(assignment => {
              const stats = getSubmissionStats(assignment);
              return (
                <div key={assignment.id} className="assignment-card">
                  <div className="assignment-header">
                    <h3>{assignment.title}</h3>
                    <span className={`status-badge ${assignment.status}`}>
                      {assignment.status === 'active' ? '🟡 Đang mở' : 
                       assignment.status === 'completed' ? '✅ Đã đóng' : '📝 Bản nháp'}
                    </span>
                  </div>
                  
                  <div className="assignment-meta">
                    <div className="meta-item">
                      <span>{assignment.class}</span>
                    </div>
                    <div className="meta-item">
                      <span>Hạn nộp: {assignment.dueDate}</span>
                    </div>
                    <div className="meta-item">
                      <span className={`deadline ${getStatusColor(assignment.status)}`}>
                        {getDaysLeft(assignment.dueDate)}
                      </span>
                    </div>
                  </div>

                  <div className="assignment-description">
                    <p>{assignment.description}</p>
                  </div>

                  <div className="assignment-stats">
                    <div className="stats-row">
                      <div className="stat-item">
                        <span className="stat-label">📝 Đã nộp:</span>
                        <span className="stat-value">{stats.submitted}/{stats.total}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">✅ Đã chấm:</span>
                        <span className="stat-value">{stats.graded}/{stats.submitted}</span>
                      </div>
                    </div>
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill submitted"
                          style={{ width: `${(stats.submitted / stats.total) * 100}%` }}
                        ></div>
                        <div 
                          className="progress-fill graded"
                          style={{ width: `${(stats.graded / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {Math.round((stats.submitted / stats.total) * 100)}% đã nộp
                      </span>
                    </div>
                  </div>

                  <div className="assignment-actions">
                    <button 
                      className="btn-outline"
                      onClick={() => handleViewSubmissions(assignment)}
                    >
                      👁️ 👁️ Xem bài nộp
                    </button>
                    <button 
                      className="btn-outline"
                      onClick={() => handleEditAssignment(assignment)}
                    >
                      ✏️ Chỉnh sửa
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={() => handleGradeAssignment(assignment)}
                    >
                      📊 Chấm điểm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        // Giao diện cho sinh viên
        <>
          <div className="student-assignments-header">
            <div className="assignments-title-section">
              <h1 className="title">Bài tập 📝 </h1>
              <p className="subtitle">📤 Nộp bài tập và xem kết quả điểm số</p>
            </div>
          </div>
          
          <div className="student-assignments-controls">
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Tìm kiếm bài tập..."
                className="search-input"
              />
              <button className="search-btn"></button>
            </div>
            <div className="filter-tabs">
              <button 
                className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Tất cả ({assignmentsList.filter(a => a.status === 'active').length})
              </button>
              <button 
                className={`tab ${filterStatus === 'pending' ? 'active' : ''}`}
                onClick={() => setFilterStatus('pending')}
              >
                🟡 Chưa nộp
              </button>
              <button 
                className={`tab ${filterStatus === 'submitted' ? 'active' : ''}`}
                onClick={() => setFilterStatus('submitted')}
              >
                📝 Đã nộp
              </button>
              <button 
                className={`tab ${filterStatus === 'graded' ? 'active' : ''}`}
                onClick={() => setFilterStatus('graded')}
              >
                ✅ Đã chấm
              </button>
            </div>
          </div>

          <div className="student-assignments-grid">
            {assignmentsList.filter(a => a.status === 'active').map(assignment => {
              // Giả lập sinh viên hiện tại đã nộp bài chưa
              const hasSubmitted = assignment.submissions.some(s => s.studentName === user?.name);
              const mySubmission = assignment.submissions.find(s => s.studentName === user?.name);
              const isOverdue = new Date(assignment.dueDate) < new Date();
              
              return (
                <div key={assignment.id} className="student-assignment-card">
                  <div className="assignment-status-indicator">
                    {hasSubmitted ? (
                      mySubmission?.status === 'graded' ? (
                        <div className="status-badge graded">✅ Đã chấm</div>
                      ) : (
                        <div className="status-badge submitted">📝 Đã nộp</div>
                      )
                    ) : isOverdue ? (
                      <div className="status-badge overdue">⏰ Quá hạn</div>
                    ) : (
                      <div className="status-badge pending">🟡 Chưa nộp</div>
                    )}
                  </div>
                  
                  <div className="assignment-content">
                    <div className="assignment-header">
                      <h3>{assignment.title}</h3>
                      <div className="assignment-points">
                        {mySubmission?.grade ? (
                          <span className="grade-display">
                            {mySubmission.grade}/{assignment.maxGrade} điểm
                          </span>
                        ) : (
                          <span className="max-grade">
                            Tối đa: {assignment.maxGrade} điểm
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="assignment-meta">
                      <span>{assignment.class}</span>
                      <span>Hạn: {assignment.dueDate}</span>
                      <span className={`deadline ${isOverdue ? 'overdue' : 'active'}`}>
                        {getDaysLeft(assignment.dueDate)}
                      </span>
                    </div>
                    
                    <div className="assignment-description">
                      <p>{assignment.description}</p>
                    </div>
                    
                    {mySubmission?.feedback && (
                      <div className="teacher-feedback">
                        <h5>Nhận xét của giáo viên:</h5>
                        <p>{mySubmission.feedback}</p>
                      </div>
                    )}
                    
                    <div className="student-assignment-actions">
                      {!hasSubmitted && !isOverdue ? (
                        <>
                          <button 
                            className="btn-primary"
                            onClick={() => {
                              alert(`📤 Nộp bài tập: ${assignment.title}\n\nVui lòng chọn file và nộp bài.`);
                            }}
                          >
                            📤 Nộp bài
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => {
                              alert(`Yêu cầu bài tập:\n\n${assignment.description}\n\nHạn nộp: ${assignment.dueDate}\nĐiểm tối đa: ${assignment.maxGrade}`);
                            }}
                          >
                            👁️ Xem yêu cầu
                          </button>
                        </>
                      ) : hasSubmitted ? (
                        <>
                          <button 
                            className="btn-outline"
                            onClick={() => {
                              alert(`Bài nộp của bạn:\n\nFile: ${mySubmission?.files.join(', ')}\nThời gian nộp: ${mySubmission?.submittedAt}\n\nTrạng thái: ${mySubmission?.status === 'graded' ? '✅ Đã chấm điểm' : 'Chờ chấm'}`);
                            }}
                          >
                            👁️ 👁️ Xem bài nộp
                          </button>
                          {mySubmission?.status !== 'graded' && (
                            <button 
                              className="btn-secondary"
                              onClick={() => {
                                alert(`🔄 Nộp lại bài tập: ${assignment.title}\n\nBạn có thể nộp lại trước khi giáo viên chấm điểm.`);
                              }}
                            >
                              🔄 Nộp lại
                            </button>
                          )}
                        </>
                      ) : (
                        <button 
                          className="btn-disabled"
                          disabled
                        >
                          ⏰ Đã quá hạn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {filteredAssignments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h3>Chưa có bài tập nào</h3>
          <p>📝 Tạo bài tập đầu tiên để bắt đầu giao bài cho sinh viên</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + 📝 Tạo bài tập đầu tiên
          </button>
        </div>
      )}

      {/* Modal 👁️ 👁️ Xem bài nộp */}
      {showViewModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bài nộp - {selectedAssignment.title}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="submissions-list">
                <div className="submissions-header">
                  <h4>Danh sách bài nộp ({selectedAssignment.submissions.length}/{selectedAssignment.totalStudents})</h4>
                  <div className="submissions-stats">
                    <span className="stat-badge submitted">
                      {selectedAssignment.submissions.length} đã nộp
                    </span>
                    <span className="stat-badge graded">
                      {selectedAssignment.submissions.filter(s => s.status === 'graded').length} đã chấm
                    </span>
                  </div>
                </div>
                
                {selectedAssignment.submissions.length > 0 ? (
                  <div className="submissions-grid">
                    {selectedAssignment.submissions.map(submission => (
                      <div key={submission.id} className="submission-item">
                        <div className="submission-info">
                          <div className="student-info">
                            <div className="student-avatar">
                              {submission.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="student-details">
                              <h5>{submission.studentName}</h5>
                              <p>{submission.studentEmail}</p>
                            </div>
                          </div>
                          <div className="submission-meta">
                            <span>{submission.submittedAt}</span>
                            <span className={`status-badge ${submission.status}`}>
                              {submission.status === 'graded' ? '✅ Đã chấm' : 
                               submission.status === 'late' ? 'Nộp muộn' : 'Chờ chấm'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="submission-files">
                          <h6>File đính kèm:</h6>
                          {submission.files.map((file, index) => (
                            <div key={index} className="file-item">
                              <span>{file}</span>
                              <button className="btn-sm">Tải về</button>
                            </div>
                          ))}
                        </div>

                        {submission.status === 'graded' && (
                          <div className="submission-grade">
                            <div className="grade-info">
                              <span className="grade-score">Điểm: {submission.grade}/{selectedAssignment.maxGrade}</span>
                              {submission.feedback && (
                                <p className="grade-feedback">{submission.feedback}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="submission-actions">
                          <button 
                            className="btn-sm"
                            onClick={() => {
                              alert(`Xem chi tiết bài nộp của ${submission.studentName}\n\nFile: ${submission.files.join(', ')}\nThời gian nộp: ${submission.submittedAt}`);
                            }}
                          >
                            Xem chi tiết
                          </button>
                          <button 
                            className="btn-sm primary"
                            onClick={() => {
                              const grade = prompt(`Nhập điểm cho ${submission.studentName} (0-${selectedAssignment.maxGrade}):`, submission.grade?.toString() || '');
                              const feedback = prompt('Nhập nhận xét:', submission.feedback || '');
                              
                              if (grade !== null && feedback !== null) {
                                const gradeNum = parseFloat(grade);
                                if (!isNaN(gradeNum) && gradeNum >= 0 && gradeNum <= selectedAssignment.maxGrade) {
                                  handleGradeSubmission(submission.id, gradeNum, feedback);
                                } else {
                                  alert(`Điểm phải từ 0 đến ${selectedAssignment.maxGrade}`);
                                }
                              }
                            }}
                          >
                            📊 Chấm điểm
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-submissions">
                    <p>Chưa có bài nộp nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ✏️ Chỉnh sửa bài tập */}
      {showEditModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Chỉnh sửa bài tập</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tiêu đề bài tập</label>
                    <input 
                      type="text" 
                      defaultValue={selectedAssignment.title}
                      id="edit-title"
                    />
                  </div>
                  <div className="form-group">
                    <label>Lớp học</label>
                    <select defaultValue={selectedAssignment.class} id="edit-class">
                      <option>React Nâng cao</option>
                      <option>Node.js Backend</option>
                      <option>Database Design</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Hạn nộp</label>
                    <input 
                      type="date" 
                      defaultValue={selectedAssignment.dueDate}
                      id="edit-dueDate"
                    />
                  </div>
                  <div className="form-group">
                    <label>Điểm tối đa</label>
                    <input 
                      type="number" 
                      defaultValue={selectedAssignment.maxGrade}
                      min="1" 
                      max="100"
                      id="edit-maxGrade"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Mô tả bài tập</label>
                  <textarea 
                    defaultValue={selectedAssignment.description}
                    rows={4}
                    id="edit-description"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select defaultValue={selectedAssignment.status} id="edit-status">
                    <option value="draft">📝 Bản nháp</option>
                    <option value="active">🟡 Đang mở</option>
                    <option value="completed">✅ Đã đóng</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    const title = (document.getElementById('edit-title') as HTMLInputElement)?.value;
                    const className = (document.getElementById('edit-class') as HTMLSelectElement)?.value;
                    const dueDate = (document.getElementById('edit-dueDate') as HTMLInputElement)?.value;
                    const maxGrade = parseInt((document.getElementById('edit-maxGrade') as HTMLInputElement)?.value);
                    const description = (document.getElementById('edit-description') as HTMLTextAreaElement)?.value;
                    const status = (document.getElementById('edit-status') as HTMLSelectElement)?.value;
                    
                    if (selectedAssignment) {
                      const updatedAssignment = {
                        ...selectedAssignment,
                        title,
                        class: className,
                        dueDate,
                        maxGrade,
                        description,
                        status: status as 'draft' | 'active' | 'completed'
                      };
                      
                      setAssignmentsList(prev => prev.map(assignment => 
                        assignment.id === selectedAssignment.id ? updatedAssignment : assignment
                      ));
                      setShowEditModal(false);
                      setSelectedAssignment(null);
                      alert('Cập nhật bài tập thành công!');
                    }
                  }}
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 📊 Chấm điểm */}
      {showGradingModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowGradingModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Chấm điểm - {selectedAssignment.title}</h2>
              <button className="modal-close" onClick={() => setShowGradingModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grading-overview">
                <div className="grading-stats">
                  <div className="stat-card">
                    <div className="stat-number">{selectedAssignment.submissions.length}</div>
                    <div className="stat-label">📋 Bài đã nộp</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{selectedAssignment.submissions.filter(s => s.status === 'graded').length}</div>
                    <div className="stat-label">✅ Đã chấm</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{selectedAssignment.submissions.length - selectedAssignment.submissions.filter(s => s.status === 'graded').length}</div>
                    <div className="stat-label">Chờ chấm</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{selectedAssignment.maxGrade}</div>
                    <div className="stat-label">Điểm tối đa</div>
                  </div>
                </div>
              </div>
              
              <div className="grading-list">
                <h4>Danh sách chấm điểm</h4>
                {selectedAssignment.submissions.length > 0 ? (
                  <div className="grading-items">
                    {selectedAssignment.submissions.map(submission => (
                      <div key={submission.id} className="grading-item">
                        <div className="student-info">
                          <div className="student-avatar">
                            {submission.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="student-details">
                            <h5>{submission.studentName}</h5>
                            <p>{submission.studentEmail}</p>
                            <span className="submission-time">{submission.submittedAt}</span>
                          </div>
                        </div>
                        
                        <div className="grading-form">
                          <div className="grade-input-group">
                            <label>Điểm:</label>
                            <input 
                              type="number" 
                              min="0" 
                              max={selectedAssignment.maxGrade}
                              defaultValue={submission.grade || ''}
                              placeholder="0"
                              id={`grade-${submission.id}`}
                              className="grade-input"
                            />
                            <span>/{selectedAssignment.maxGrade}</span>
                          </div>
                          
                          <div className="feedback-group">
                            <label>Nhận xét:</label>
                            <textarea 
                              defaultValue={submission.feedback || ''}
                              placeholder="Nhập nhận xét cho sinh viên..."
                              rows={2}
                              id={`feedback-${submission.id}`}
                              className="feedback-input"
                            ></textarea>
                          </div>
                          
                          <div className="grading-actions">
                            <button 
                              className="btn-sm"
                              onClick={() => {
                                alert(`File bài nộp: ${submission.files.join(', ')}\n\nClick OK để tải về file`);
                              }}
                            >
                              Xem file
                            </button>
                            <button 
                              className="btn-sm primary"
                              onClick={() => {
                                const gradeInput = document.getElementById(`grade-${submission.id}`) as HTMLInputElement;
                                const feedbackInput = document.getElementById(`feedback-${submission.id}`) as HTMLTextAreaElement;
                                
                                const grade = parseFloat(gradeInput.value);
                                const feedback = feedbackInput.value;
                                
                                if (isNaN(grade) || grade < 0 || grade > selectedAssignment.maxGrade) {
                                  alert(`Điểm phải từ 0 đến ${selectedAssignment.maxGrade}`);
                                  return;
                                }
                                
                                handleGradeSubmission(submission.id, grade, feedback);
                              }}
                            >
                              Lưu điểm
                            </button>
                          </div>
                        </div>
                        
                        {submission.status === 'graded' && (
                          <div className="current-grade">
                            <div className="grade-display">
                              <span className="grade-score">{submission.grade}/{selectedAssignment.maxGrade}</span>
                              <span className="grade-status">✅ Đã chấm</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-submissions">
                    <p>Chưa có bài nộp nào để chấm</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 📝 ➕ Tạo bài tập mới */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 ➕ Tạo bài tập mới</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="create-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tiêu đề bài tập</label>
                    <input type="text" placeholder="Nhập tiêu đề bài tập" />
                  </div>
                  <div className="form-group">
                    <label>Lớp học</label>
                    <select>
                      <option>Chọn lớp học</option>
                      <option>React Nâng cao</option>
                      <option>Node.js Backend</option>
                      <option>Database Design</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Hạn nộp</label>
                    <input type="datetime-local" />
                  </div>
                  <div className="form-group">
                    <label>Điểm tối đa</label>
                    <input type="number" placeholder="10" min="1" max="100" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Mô tả bài tập</label>
                  <textarea placeholder="Mô tả chi tiết yêu cầu bài tập" rows={4}></textarea>
                </div>
                <div className="form-group">
                  <label>Tài liệu đính kèm</label>
                  <div className="file-upload-area">
                    <input type="file" multiple accept=".pdf,.doc,.docx,.zip,.rar" />
                    <div className="file-upload-label">
                      Chọn tập tin hoặc kéo thả vào đây
                    </div>
                    <p className="file-upload-note">Hỗ trợ: PDF, Word, Archive (Tối đa 50MB)</p>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button className="btn-outline">Lưu nháp</button>
                <button className="btn-primary">📝 Tạo bài tập</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}