interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
  isOpen,
  onClose,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'classes', label: 'Lớp học', icon: '📚' },
    { id: 'lectures', label: 'Bài giảng', icon: '📖' },
    { id: 'assignments', label: 'Bài tập', icon: '📝' },
    { id: 'students', label: 'Sinh viên', icon: '👥' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
  ];

  const filteredMenuItems =
    user?.role === 'student'
      ? menuItems.filter((item) => item.id !== 'students')
      : menuItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2 className="logo">OnlineClass</h2>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Đóng menu"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {user && (
        <div className="user-info">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="user-details">
            <div className="user-name">{user.name}</div>
            <div className="user-role">
              {user.role === 'teacher' ? '👨‍🏫 Giáo viên' : '👨‍🎓 Sinh viên'}
            </div>
          </div>
        </div>
      )}

      <nav>
        {filteredMenuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-button" type="button" onClick={onLogout}>
          <span className="menu-icon">🚪</span>
          <span className="menu-label">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
