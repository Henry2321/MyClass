import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Import User type from AuthContext
interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'student',
    avatar: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    assignmentReminders: true,
    classUpdates: true
  });

  // Đồng bộ dữ liệu khi user thay đổi
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'student',
        avatar: ''
      });
    }
  }, [user]);

  const handleProfileChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = () => {
    // Only proceed if user exists and has an id
    if (!user || !user.id) {
      alert('Không thể cập nhật: Thông tin người dùng không hợp lệ');
      return;
    }

    // Cập nhật thông tin user trong AuthContext
    const updatedUser: User = {
      id: user.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as 'teacher' | 'student'
    };
    
    if (updateUser) {
      updateUser(updatedUser);
    }
    
    alert('Đã lưu thay đổi thành công! Vai trò mới sẽ được cập nhật.');
    
    // Reload trang để cập nhật giao diện
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <h1 className="title">⚙️ Cài đặt ⚙️ </h1>
      
      <div className="settings-container">
        {/* Profile Settings */}
        <div className="settings-section">
          <h2>Thông tin cá nhân</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Vai trò</label>
              <select
                value={profile.role}
                onChange={(e) => handleProfileChange('role', e.target.value)}
                className="form-select"
              >
                <option value="teacher">Giáo viên</option>
                <option value="student">Sinh viên</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Ảnh đại diện</label>
              <div className="avatar-upload">
                <div className="avatar-preview">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Avatar" />
                  ) : (
                    <div className="avatar-placeholder">
                      {profile.name.charAt(0)}
                    </div>
                  )}
                </div>
                <button className="btn-outline">Chọn ảnh</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h2>Thông báo</h2>
          <div className="settings-form">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.emailNotifications}
                  onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                />
                <span>Thông báo qua email</span>
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.pushNotifications}
                  onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                />
                <span>Thông báo đẩy</span>
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.assignmentReminders}
                  onChange={(e) => handleNotificationChange('assignmentReminders', e.target.checked)}
                />
                <span>Nhắc nhở bài tập</span>
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.classUpdates}
                  onChange={(e) => handleNotificationChange('classUpdates', e.target.checked)}
                />
                <span>Cập nhật lớp học</span>
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="settings-section">
          <h2>Bảo mật</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>Mật khẩu hiện tại</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu mới"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                className="form-input"
              />
            </div>
            
            <button className="btn-primary">Đổi mật khẩu</button>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-actions">
          <button className="btn-primary" onClick={handleSaveChanges}>Lưu thay đổi</button>
          <button className="btn-outline" onClick={() => {
            // Reset về dữ liệu gốc
            if (user) {
              setProfile({
                name: user.name || '',
                email: user.email || '',
                role: user.role || 'student',
                avatar: ''
              });
            }
          }}>Hủy</button>
        </div>
      </div>
    </>
  );
}