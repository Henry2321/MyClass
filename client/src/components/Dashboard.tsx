import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  color: string;
  trend: number;
}

interface Task {
  id: string;
  title: string;
  class: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface Activity {
  id: string;
  message: string;
  time: string;
  type: 'submission' | 'class' | 'deadline' | 'grade';
}

export default function Dashboard({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [stats] = useState<StatCard[]>(
    user?.role === 'teacher' ? [
      { title: 'Lớp học', value: 12, icon: '📚', color: 'blue', trend: 8 },
      { title: 'Sinh viên', value: 320, icon: '👥', color: 'green', trend: 15 },
      { title: 'Bài tập', value: 45, icon: '📝', color: 'orange', trend: -3 },
      { title: 'Bài giảng', value: 28, icon: '🎓', color: 'purple', trend: 12 }
    ] : [
      { title: 'Lớp tham gia', value: 8, icon: '📚', color: 'blue', trend: 12 },
      { title: 'Bài đã nộp', value: 23, icon: '📝', color: 'green', trend: 8 },
      { title: 'Bài chưa nộp', value: 5, icon: '⏰', color: 'orange', trend: -15 },
      { title: 'Điểm trung bình', value: 8.5, icon: '🎆', color: 'purple', trend: 5 }
    ]
  );

  const [tasks] = useState<Task[]>(
    user?.role === 'teacher' ? [
      { id: '1', title: 'OOP – Kế thừa', class: 'CNTT01', deadline: 'Hôm nay 23:59', priority: 'high', completed: false },
      { id: '2', title: 'React – useEffect', class: 'Web nâng cao', deadline: 'Còn 2 ngày', priority: 'medium', completed: false },
      { id: '3', title: 'CSDL – Truy vấn SQL', class: 'KTPM', deadline: 'Còn 5 ngày', priority: 'low', completed: false },
      { id: '4', title: 'JavaScript ES6', class: 'Web cơ bản', deadline: 'Còn 1 tuần', priority: 'low', completed: true }
    ] : [
      { id: '1', title: 'Bài tập 📝 OOP - Kế thừa', class: 'CNTT01', deadline: 'Hôm nay 23:59', priority: 'high', completed: false },
      { id: '2', title: 'Thực hành React Hooks', class: 'Web nâng cao', deadline: 'Còn 2 ngày', priority: 'medium', completed: false },
      { id: '3', title: 'Bài tập 📝 CSDL - Query', class: 'KTPM', deadline: 'Còn 5 ngày', priority: 'low', completed: true },
      { id: '4', title: 'Project cuối kỳ', class: 'Web nâng cao', deadline: 'Còn 2 tuần', priority: 'medium', completed: false }
    ]
  );

  const [activities] = useState<Activity[]>(
    user?.role === 'teacher' ? [
      { id: '1', message: 'Sinh viên Nguyễn A nộp bài React', time: '5 phút trước', type: 'submission' },
      { id: '2', message: '➕ Tạo lớp học mới: NodeJS', time: '1 giờ trước', type: 'class' },
      { id: '3', message: 'Bài OOP sắp hết hạn nộp', time: '2 giờ trước', type: 'deadline' },
      { id: '4', message: 'Hoàn thành chấm 15 bài tập', time: '3 giờ trước', type: 'grade' }
    ] : [
      { id: '1', message: '📤 Nộp bài thành công: React Hooks', time: '30 phút trước', type: 'submission' },
      { id: '2', message: 'Tham gia lớp học: CSDL nâng cao', time: '2 giờ trước', type: 'class' },
      { id: '3', message: 'Nhận điểm bài OOP: 8.5/10', time: '1 ngày trước', type: 'grade' },
      { id: '4', message: 'Bài tập 📝 mới: JavaScript ES6', time: '2 ngày trước', type: 'deadline' }
    ]
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'submission': return '📤';
      case 'class': return '🏠';
      case 'deadline': return '⏰';
      case 'grade': return '✅';
      default: return '📋';
    }
  };

  const handleQuickAction = (action: string) => {
    setShowQuickActions(false);
    
    switch(action) {
      case 'create-class':
        setShowCreateClassModal(true);
        break;
      case 'create-assignment':
        setShowCreateAssignmentModal(true);
        break;
      case 'view-reports':
        setShowReportsModal(true);
        break;
      case 'manage-students':
        setShowManageStudentsModal(true);
        break;
      case 'create-lesson':
        setShowCreateLessonModal(true);
        break;
      case 'settings':
        onTabChange('settings');
        break;
      case 'submitted-assignments':
        onTabChange('submitted-assignments');
        break;
      case 'upcoming-deadlines':
        onTabChange('deadlines');
        break;
      case 'access-lectures':
        onTabChange('lectures');
        break;
      case 'view-grades':
        onTabChange('grades');
        break;
      case 'message-teacher':
        onTabChange('messages');
        break;
      case 'schedule':
        onTabChange('schedule');
        break;
    }
  };

  return (
    <>
      {/* Header với thời gian thực */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="title">{getGreeting()} {user?.name || 'Giáo viên'} 👋</h1>
          <p className="subtitle">
            {currentTime.toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} - {currentTime.toLocaleTimeString('vi-VN')}
          </p>
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
              {user?.role === 'teacher' ? (
                // ⚡ Thao tác nhanh cho giáo viên
                <>
                  <button onClick={() => handleQuickAction('create-class')}>➕ Tạo lớp học</button>
                  <button onClick={() => handleQuickAction('create-assignment')}>📝 Tạo bài tập</button>
                  <button onClick={() => handleQuickAction('view-reports')}>📊 Xem báo cáo</button>
                  <button onClick={() => handleQuickAction('manage-students')}>👥 Quản lý sinh viên</button>
                  <button onClick={() => handleQuickAction('create-lesson')}>📚 Tạo bài giảng</button>
                  <button onClick={() => handleQuickAction('settings')}>⚙️ ⚙️ Cài đặt ⚙️ lớp học</button>
                </>
              ) : (
                // ⚡ Thao tác nhanh cho sinh viên
                <>
                  <button onClick={() => handleQuickAction('submitted-assignments')}>📋 Bài đã nộp</button>
                  <button onClick={() => handleQuickAction('upcoming-deadlines')}>⏰ Deadline sắp tới</button>
                  <button onClick={() => handleQuickAction('access-lectures')}>📖 Truy cập bài giảng</button>
                  <button onClick={() => handleQuickAction('view-grades')}>📊 Xem điểm số</button>
                  <button onClick={() => handleQuickAction('message-teacher')}>💬 Tin nhắn với GV</button>
                  <button onClick={() => handleQuickAction('schedule')}>📅 Lịch học</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* CỘT TRÁI */}
        <div className="left-column">
          {/* 4 Ô THỐNG KÊ với animation */}
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className={`stat-card ${stat.color}`}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <h3>{stat.value}</h3>
                  <p>{stat.title}</p>
                  <div className={`trend ${stat.trend > 0 ? 'up' : 'down'}`}>
                    {stat.trend > 0 ? '↗️' : '↘️'} {Math.abs(stat.trend)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BÀI TẬP với filter */}
          <div className="today-box">
            <div className="section-header">
              <h2>📌 {user?.role === 'teacher' ? 'Bài tập & Deadline' : 'Bài tập của bạn'}</h2>
              <div className="filter-tabs">
                <button 
                  className={selectedPeriod === 'today' ? 'active' : ''}
                  onClick={() => setSelectedPeriod('today')}
                >
                  Hôm nay
                </button>
                <button 
                  className={selectedPeriod === 'week' ? 'active' : ''}
                  onClick={() => setSelectedPeriod('week')}
                >
                  Tuần này
                </button>
                <button 
                  className={selectedPeriod === 'all' ? 'active' : ''}
                  onClick={() => setSelectedPeriod('all')}
                >
                  Tất cả
                </button>
              </div>
            </div>

            <div className="task-list">
              {tasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <div className="task-checkbox">
                    <input 
                      type="checkbox" 
                      checked={task.completed}
                      onChange={() => {}}
                    />
                  </div>
                  <div className="task-content">
                    <h4>{task.title}</h4>
                    <span className="task-class">📚 {task.class}</span>
                  </div>
                  <div className="task-meta">
                    <span className={`deadline ${getPriorityColor(task.priority)}`}>
                      {task.deadline}
                    </span>
                    <div className={`priority-badge ${task.priority}`}>
                      {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BIỂU ĐỒ TIẾN ĐỘ */}
          <div className="progress-section">
            <h3>📈 {user?.role === 'teacher' ? 'Tiến độ tuần này' : 'Tiến độ học tập'}</h3>
            <div className="progress-items">
              {user?.role === 'teacher' ? (
                <>
                  <div className="progress-item">
                    <span>Bài tập đã chấm</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '75%'}}></div>
                    </div>
                    <span>75%</span>
                  </div>
                  <div className="progress-item">
                    <span>Lớp học hoàn thành</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '60%'}}></div>
                    </div>
                    <span>60%</span>
                  </div>
                  <div className="progress-item">
                    <span>Phản hồi sinh viên</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '90%'}}></div>
                    </div>
                    <span>90%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="progress-item">
                    <span>Bài tập đã hoàn thành</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '82%'}}></div>
                    </div>
                    <span>82%</span>
                  </div>
                  <div className="progress-item">
                    <span>Bài giảng đã xem</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '95%'}}></div>
                    </div>
                    <span>95%</span>
                  </div>
                  <div className="progress-item">
                    <span>Tiến độ khóa học</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '68%'}}></div>
                    </div>
                    <span>68%</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="right-column">
          {/* HOẠT ĐỘNG với real-time */}
          <div className="panel-card activities">
            <div className="panel-header">
              <h3>📣 Hoạt động gần đây</h3>
              <button className="refresh-btn">🔄</button>
            </div>
            <div className="activity-list">
              {activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <p>{activity.message}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LỊCH HÔM NAY với thời gian thực */}
          <div className="panel-card schedule">
            <h3>📅 Lịch hôm nay</h3>
            <div className="schedule-list">
              <div className="schedule-item current">
                <div className="time">10:00</div>
                <div className="event">
                  <span className="event-title">React Hooks</span>
                  <span className="event-class">Lớp Web nâng cao</span>
                </div>
                <div className="status ongoing">Đang diễn ra</div>
              </div>
              <div className="schedule-item">
                <div className="time">14:00</div>
                <div className="event">
                  <span className="event-title">Họp khoa</span>
                  <span className="event-class">Phòng 301</span>
                </div>
                <div className="status upcoming">Sắp tới</div>
              </div>
              <div className="schedule-item">
                <div className="time">20:00</div>
                <div className="event">
                  <span className="event-title">Chấm bài tập</span>
                  <span className="event-class">OOP - CNTT01</span>
                </div>
                <div className="status pending">Chờ xử lý</div>
              </div>
            </div>
          </div>

          {/* THỐNG KÊ NHANH */}
          <div className="panel-card quick-stats">
            <h3>⚡ Thống kê nhanh</h3>
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <span className="stat-number">23</span>
                <span className="stat-label">Bài chưa chấm</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">8</span>
                <span className="stat-label">Lớp hôm nay</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">156</span>
                <span className="stat-label">Tin nhắn mới</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">4.8</span>
                <span className="stat-label">Đánh giá TB</span>
              </div>
            </div>
          </div>

          {/* THÔNG BÁO */}
          <div className="panel-card notifications">
            <h3>🔔 Thông báo</h3>
            <div className="notification-list">
              <div className="notification-item urgent">
                <span className="notification-icon">🚨</span>
                <div>
                  <p>Deadline bài tập OOP còn 2 giờ</p>
                  <small>Lớp CNTT01</small>
                </div>
              </div>
              <div className="notification-item">
                <span className="notification-icon">📧</span>
                <div>
                  <p>5 email mới từ sinh viên</p>
                  <small>Cần phản hồi</small>
                </div>
              </div>
              <div className="notification-item">
                <span className="notification-icon">📊</span>
                <div>
                  <p>Báo cáo tháng đã sẵn sàng</p>
                  <small>Xem chi tiết</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal ➕ Tạo lớp học */}
      {showCreateClassModal && (
        <div className="modal-overlay" onClick={() => setShowCreateClassModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 Tạo lớp học mới</h2>
              <button className="modal-close" onClick={() => setShowCreateClassModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên lớp học</label>
                <input type="text" placeholder="Nhập tên lớp học" />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea placeholder="Mô tả về lớp học" rows={3}></textarea>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateClassModal(false)}>Hủy</button>
                <button className="btn-primary">Tạo lớp</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 📝 Tạo bài tập */}
      {showCreateAssignmentModal && (
        <div className="modal-overlay" onClick={() => setShowCreateAssignmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 Tạo bài tập mới</h2>
              <button className="modal-close" onClick={() => setShowCreateAssignmentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tiêu đề bài tập</label>
                <input type="text" placeholder="Nhập tiêu đề bài tập" />
              </div>
              <div className="form-group">
                <label>Lớp học</label>
                <select>
                  <option>Chọn lớp học</option>
                  <option>CNTT01</option>
                  <option>Web nâng cao</option>
                  <option>KTPM</option>
                </select>
              </div>
              <div className="form-group">
                <label>Hạn nộp</label>
                <input type="datetime-local" />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea placeholder="Mô tả chi tiết bài tập" rows={4}></textarea>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateAssignmentModal(false)}>Hủy</button>
                <button className="btn-primary">📝 Tạo bài tập</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 📊 Xem báo cáo */}
      {showReportsModal && (
        <div className="modal-overlay" onClick={() => setShowReportsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Báo cáo tổng quan</h2>
              <button className="modal-close" onClick={() => setShowReportsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="report-stats">
                <div className="report-card">
                  <h3>📚 Lớp học</h3>
                  <div className="report-number">12</div>
                  <p>Tổng số lớp đang dạy</p>
                </div>
                <div className="report-card">
                  <h3>👥 Sinh viên</h3>
                  <div className="report-number">320</div>
                  <p>Tổng số sinh viên</p>
                </div>
                <div className="report-card">
                  <h3>📝 Bài tập</h3>
                  <div className="report-number">45</div>
                  <p>Bài tập đã giao</p>
                </div>
                <div className="report-card">
                  <h3>✅ Đã chấm</h3>
                  <div className="report-number">38</div>
                  <p>Bài tập đã chấm</p>
                </div>
              </div>
              <div className="report-chart">
                <h4>📈 Biểu đồ hoạt động tuần này</h4>
                <div className="chart-placeholder">
                  <p>Biểu đồ sẽ được hiển thị ở đây</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 👥 Quản lý sinh viên */}
      {showManageStudentsModal && (
        <div className="modal-overlay" onClick={() => setShowManageStudentsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👥 Quản lý sinh viên</h2>
              <button className="modal-close" onClick={() => setShowManageStudentsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="student-actions">
                <button className="btn-primary">➕ Thêm sinh viên</button>
                <button className="btn-outline">📤 Import danh sách</button>
                <button className="btn-outline">📊 Xuất báo cáo</button>
              </div>
              <div className="student-list">
                <div className="student-item">
                  <div className="student-info">
                    <div className="student-avatar">N</div>
                    <div>
                      <h4>Nguyễn Văn A</h4>
                      <p>nguyenvana@email.com</p>
                    </div>
                  </div>
                  <div className="student-stats">
                    <span>Lớp: CNTT01</span>
                    <span>Điểm TB: 8.5</span>
                  </div>
                  <div className="student-actions-btn">
                    <button className="btn-sm">Xem</button>
                    <button className="btn-sm">Sửa</button>
                  </div>
                </div>
                <div className="student-item">
                  <div className="student-info">
                    <div className="student-avatar">T</div>
                    <div>
                      <h4>Trần Thị B</h4>
                      <p>tranthib@email.com</p>
                    </div>
                  </div>
                  <div className="student-stats">
                    <span>Lớp: Web nâng cao</span>
                    <span>Điểm TB: 9.2</span>
                  </div>
                  <div className="student-actions-btn">
                    <button className="btn-sm">Xem</button>
                    <button className="btn-sm">Sửa</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 📚 Tạo bài giảng */}
      {showCreateLessonModal && (
        <div className="modal-overlay" onClick={() => setShowCreateLessonModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 Tạo bài giảng mới</h2>
              <button className="modal-close" onClick={() => setShowCreateLessonModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="lesson-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tiêu đề bài giảng</label>
                    <input type="text" placeholder="Nhập tiêu đề bài giảng" />
                  </div>
                  <div className="form-group">
                    <label>Lớp học</label>
                    <select>
                      <option>Chọn lớp học</option>
                      <option>CNTT01</option>
                      <option>Web nâng cao</option>
                      <option>KTPM</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Thời gian bắt đầu</label>
                    <input type="datetime-local" />
                  </div>
                  <div className="form-group">
                    <label>Thời lượng (phút)</label>
                    <input type="number" placeholder="90" min="15" max="300" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Mô tả bài giảng</label>
                  <textarea placeholder="Mô tả nội dung bài giảng" rows={4}></textarea>
                </div>
                <div className="form-group">
                  <label>Tài liệu đính kèm</label>
                  <div className="file-upload-area">
                    <input type="file" id="lesson-files" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" />
                    <label htmlFor="lesson-files" className="file-upload-label">
                      📁 Chọn tập tin hoặc kéo thả vào đây
                    </label>
                    <p className="file-upload-note">Hỗ trợ: PDF, PowerPoint, Word (Tối đa 50MB)</p>
                  </div>
                </div>
                <div className="lesson-settings">
                  <h4>⚙️ Cài đặt bài giảng</h4>
                  <div className="settings-grid">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span>Cho phép ghi hình</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span>Yêu cầu xác nhận tham gia</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span>Cho phép chat</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span>Tự động gửi thông báo</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateLessonModal(false)}>Hủy</button>
                <button className="btn-outline">Lưu nháp</button>
                <button className="btn-primary">📚 Tạo bài giảng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ⚙️ Cài đặt ⚙️ */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Cài đặt hệ thống</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="settings-tabs">
                <div className="tab-nav">
                  <button className="tab-btn active">Thông tin cá nhân</button>
                  <button className="tab-btn">Lớp học</button>
                  <button className="tab-btn">Thông báo</button>
                  <button className="tab-btn">Bảo mật</button>
                </div>
                <div className="tab-content">
                  <div className="settings-section">
                    <h4>👤 Thông tin cá nhân</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Họ và tên</label>
                        <input type="text" defaultValue={user?.name || ''} />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" defaultValue={user?.email || ''} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Số điện thoại</label>
                        <input type="tel" placeholder="Nhập số điện thoại" />
                      </div>
                      <div className="form-group">
                        <label>Khoa/Bộ môn</label>
                        <input type="text" placeholder="Nhập khoa/bộ môn" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Tiểu sử</label>
                      <textarea placeholder="Giới thiệu về bản thân" rows={3}></textarea>
                    </div>
                  </div>
                  
                  <div className="settings-section">
                    <h4>🔔 Cài đặt thông báo</h4>
                    <div className="notification-settings">
                      <label className="checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Thông báo email khi có bài nộp mới</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Thông báo khi sinh viên tham gia lớp</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" />
                        <span>Thông báo deadline bài tập</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Thông báo tin nhắn mới</span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h4>🔒 Bảo mật</h4>
                    <div className="form-group">
                      <label>Mật khẩu hiện tại</label>
                      <input type="password" placeholder="Nhập mật khẩu hiện tại" />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Mật khẩu mới</label>
                        <input type="password" placeholder="Nhập mật khẩu mới" />
                      </div>
                      <div className="form-group">
                        <label>Xác nhận mật khẩu</label>
                        <input type="password" placeholder="Nhập lại mật khẩu mới" />
                      </div>
                    </div>
                    <div className="security-options">
                      <label className="checkbox-label">
                        <input type="checkbox" />
                        <span>Bật xác thực 2 yếu tố (2FA)</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Thông báo khi đăng nhập từ thiết bị mới</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowSettingsModal(false)}>Hủy</button>
                <button className="btn-primary">Lưu thay đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
