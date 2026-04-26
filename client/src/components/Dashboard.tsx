import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiCall from '../utils/api';

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  meta?: string;
}

interface Task {
  id: string;
  title: string;
  className: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface ActivityItem {
  id: string;
  message: string;
  createdAt: string;
  type: string;
}

interface ScheduleItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  subtitle: string;
}

interface ProgressItem {
  label: string;
  value: number;
}

interface QuickStat {
  label: string;
  value: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardData {
  stats: StatCard[];
  tasks: Task[];
  activities: ActivityItem[];
  schedule: ScheduleItem[];
  progress: ProgressItem[];
  quickStats: QuickStat[];
  notifications: NotificationItem[];
}

const EMPTY_DASHBOARD: DashboardData = {
  stats: [],
  tasks: [],
  activities: [],
  schedule: [],
  progress: [],
  quickStats: [],
  notifications: [],
};

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
};

const getRelativeTime = (value: string) => {
  const target = new Date(value);
  const diffMs = target.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) {
    return 'Vừa xong';
  }

  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(minutes, 'minute');
  }

  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(hours, 'hour');
  }

  const days = Math.round(diffMs / 86_400_000);
  return new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(days, 'day');
};

const formatDeadline = (dueDate: string) => {
  const target = new Date(dueDate);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfTarget = new Date(target);
  startOfTarget.setHours(0, 0, 0, 0);

  if (target < now) {
    return `Quá hạn ${target.toLocaleDateString('vi-VN')}`;
  }

  if (startOfTarget.getTime() === startOfToday.getTime()) {
    return `Hôm nay ${target.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (startOfTarget.getTime() === startOfTomorrow.getTime()) {
    return `Ngày mai ${target.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const diffDays = Math.ceil((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays <= 7) {
    return `Còn ${diffDays} ngày`;
  }

  return target.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'submission':
      return '📤';
    case 'grade':
      return '✅';
    case 'class':
      return '🏫';
    case 'lecture':
      return '📚';
    default:
      return '📌';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'assignment':
      return '📝';
    case 'lecture':
      return '📚';
    case 'grade':
      return '🎯';
    case 'class':
      return '🏫';
    default:
      return '🔔';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'red';
    case 'medium':
      return 'orange';
    case 'low':
      return 'green';
    default:
      return 'gray';
  }
};

const getScheduleStatus = (item: ScheduleItem, currentTime: Date) => {
  if (item.dayOfWeek !== currentTime.getDay()) {
    return { key: 'upcoming', label: 'Sắp tới' };
  }

  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMinutes = parseTimeToMinutes(item.startTime);
  const endMinutes = parseTimeToMinutes(item.endTime);

  if (nowMinutes < startMinutes) {
    return { key: 'upcoming', label: 'Sắp tới' };
  }

  if (nowMinutes > endMinutes) {
    return { key: 'pending', label: 'Đã xong' };
  }

  return { key: 'ongoing', label: 'Đang diễn ra' };
};

const filterTasks = (tasks: Task[], selectedPeriod: string) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  if (selectedPeriod === 'today') {
    return tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfToday && dueDate < endOfToday;
    });
  }

  if (selectedPeriod === 'week') {
    return tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfToday && dueDate < endOfWeek;
    });
  }

  return tasks;
};

export default function Dashboard({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    try {
      setError('');
      setRefreshing(true);

      const response = await apiCall('/api/dashboard/overview');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tải dashboard');
      }

      setDashboardData({
        stats: data.stats || [],
        tasks: data.tasks || [],
        activities: data.activities || [],
        schedule: data.schedule || [],
        progress: data.progress || [],
        quickStats: data.quickStats || [],
        notifications: data.notifications || [],
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Không thể tải dashboard';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [user?.id]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handleQuickAction = (action: string) => {
    setShowQuickActions(false);

    switch (action) {
      case 'create-class':
        onTabChange('classes');
        break;
      case 'create-assignment':
        onTabChange('assignments');
        break;
      case 'view-reports':
        onTabChange('dashboard');
        break;
      case 'manage-students':
        onTabChange('students');
        break;
      case 'create-lecture':
        onTabChange('lectures');
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
      case 'schedule':
        onTabChange('schedule');
        break;
      default:
        break;
    }
  };

  const visibleTasks = filterTasks(dashboardData.tasks, selectedPeriod);
  const todaySchedule = dashboardData.schedule.filter(
    (item) => item.dayOfWeek === currentTime.getDay(),
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="title">{getGreeting()} {user?.name || 'bạn'} 👋</h1>
          <p className="subtitle">
            {currentTime.toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} - {currentTime.toLocaleTimeString('vi-VN')}
          </p>
          {error && <p className="subtitle" style={{ color: '#dc2626' }}>{error}</p>}
        </div>

        <div className="header-actions">
          <button
            className="quick-action-btn"
            onClick={() => setShowQuickActions((value) => !value)}
          >
            ⚡ Thao tác nhanh
          </button>
          {showQuickActions && (
            <div className="quick-actions-dropdown">
              {user?.role === 'teacher' ? (
                <>
                  <button onClick={() => handleQuickAction('create-class')}>➕ Tạo lớp học</button>
                  <button onClick={() => handleQuickAction('create-assignment')}>📝 Tạo bài tập</button>
                  <button onClick={() => handleQuickAction('view-reports')}>📊 Xem dashboard</button>
                  <button onClick={() => handleQuickAction('manage-students')}>👥 Quản lý sinh viên</button>
                  <button onClick={() => handleQuickAction('create-lecture')}>📚 Quản lý bài giảng</button>
                  <button onClick={() => handleQuickAction('settings')}>⚙️ Cài đặt</button>
                </>
              ) : (
                <>
                  <button onClick={() => handleQuickAction('submitted-assignments')}>📋 Bài đã nộp</button>
                  <button onClick={() => handleQuickAction('upcoming-deadlines')}>⏰ Deadline sắp tới</button>
                  <button onClick={() => handleQuickAction('access-lectures')}>📖 Bài giảng</button>
                  <button onClick={() => handleQuickAction('view-grades')}>📊 Xem điểm</button>
                  <button onClick={() => handleQuickAction('schedule')}>📅 Lịch học</button>
                  <button onClick={() => handleQuickAction('settings')}>⚙️ Cài đặt</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="left-column">
          <div className="stats-grid">
            {dashboardData.stats.map((stat) => (
              <div key={stat.title} className={`stat-card ${stat.color}`}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <h3>{stat.value}</h3>
                  <p>{stat.title}</p>
                  <div className="trend up">{stat.meta || 'Dữ liệu thật'}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="today-box">
            <div className="section-header">
              <h2>📌 {user?.role === 'teacher' ? 'Bài tập & deadline' : 'Bài tập của bạn'}</h2>
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
              {visibleTasks.length === 0 ? (
                <div className="task-item">
                  <div className="task-content">
                    <h4>Chưa có công việc trong khoảng thời gian này</h4>
                  </div>
                </div>
              ) : (
                visibleTasks.map((task) => (
                  <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-checkbox">
                      <input type="checkbox" checked={task.completed} onChange={() => undefined} />
                    </div>
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      <span className="task-class">📚 {task.className}</span>
                    </div>
                    <div className="task-meta">
                      <span className={`deadline ${getPriorityColor(task.priority)}`}>
                        {formatDeadline(task.dueDate)}
                      </span>
                      <div className={`priority-badge ${task.priority}`}>
                        {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="progress-section">
            <h3>📈 {user?.role === 'teacher' ? 'Tiến độ giảng dạy' : 'Tiến độ học tập'}</h3>
            <div className="progress-items">
              {dashboardData.progress.map((item) => (
                <div key={item.label} className="progress-item">
                  <span>{item.label}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.value}%` }}></div>
                  </div>
                  <span>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="panel-card activities">
            <div className="panel-header">
              <h3>📣 Hoạt động gần đây</h3>
              <button className="refresh-btn" onClick={() => void loadDashboard()}>
                {refreshing ? '⏳' : '🔄'}
              </button>
            </div>
            <div className="activity-list">
              {dashboardData.activities.length === 0 ? (
                <div className="activity-item">
                  <div className="activity-content">
                    <p>Chưa có hoạt động gần đây</p>
                  </div>
                </div>
              ) : (
                dashboardData.activities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <p>{activity.message}</p>
                      <span className="activity-time">{getRelativeTime(activity.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel-card schedule">
            <h3>📅 Lịch hôm nay</h3>
            <div className="schedule-list">
              {todaySchedule.length === 0 ? (
                <div className="schedule-item">
                  <div className="event">
                    <span className="event-title">Không có lịch học hôm nay</span>
                  </div>
                </div>
              ) : (
                todaySchedule.map((item) => {
                  const status = getScheduleStatus(item, currentTime);

                  return (
                    <div
                      key={item.id}
                      className={`schedule-item ${status.key === 'ongoing' ? 'current' : ''}`}
                    >
                      <div className="time">{item.startTime}</div>
                      <div className="event">
                        <span className="event-title">{item.title}</span>
                        <span className="event-class">
                          {item.subtitle} • {item.endTime}
                        </span>
                      </div>
                      <div className={`status ${status.key}`}>{status.label}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="panel-card quick-stats">
            <h3>⚡ Thống kê nhanh</h3>
            <div className="quick-stats-grid">
              {dashboardData.quickStats.map((item) => (
                <div key={item.label} className="quick-stat">
                  <span className="stat-number">{item.value}</span>
                  <span className="stat-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card notifications">
            <h3>🔔 Thông báo</h3>
            <div className="notification-list">
              {dashboardData.notifications.length === 0 ? (
                <div className="notification-item">
                  <div>
                    <p>Chưa có thông báo</p>
                  </div>
                </div>
              ) : (
                dashboardData.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.isRead ? '' : 'urgent'}`}
                  >
                    <span className="notification-icon">{getNotificationIcon(notification.type)}</span>
                    <div>
                      <p>{notification.message}</p>
                      <small>{getRelativeTime(notification.createdAt)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
