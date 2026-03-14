

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
}

export default function Sidebar({ activeTab, onTabChange, user, onLogout }: SidebarProps) {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'classes', label: 'Lớp học', icon: '📚' },
    { id: 'classroom', label: 'Phòng học ảo', icon: '🏫' }, // ⭐ thêm tab map
    { id: 'lectures', label: 'Bài giảng', icon: '📖' },
    { id: 'assignments', label: 'Bài tập', icon: '📝' },
    { id: 'students', label: 'Sinh viên', icon: '👥' },
    { id: 'settings', label: 'Cài đặt', icon: '⚙️' }
  ];

  // student không xem được tab students
  const filteredMenuItems =
    user?.role === 'student'
      ? menuItems.filter(item => item.id !== 'students')
      : menuItems;

  return (
    <aside className="sidebar">

      <h2 className="logo">OnlineClass</h2>

      {user && (
        <div className="user-info">

          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="user-details">

            <div className="user-name">
              {user.name}
            </div>

            <div className="user-role">
              {user.role === 'teacher'
                ? '👨‍🏫 Giáo viên'
                : '👨‍🎓 Sinh viên'}
            </div>

          </div>

        </div>
      )}

      <nav>

        {filteredMenuItems.map(item => (

          <a
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => onTabChange(item.id)}
            style={{ cursor: "pointer" }}
          >

            <span className="menu-icon">
              {item.icon}
            </span>

            {item.label}

          </a>

        ))}

      </nav>

      <div className="sidebar-footer">

        <button
          className="logout-button"
          onClick={onLogout}
        >

          <span className="menu-icon">
            🚪
          </span>

          Đăng xuất

        </button>

      </div>

    </aside>
  );
}