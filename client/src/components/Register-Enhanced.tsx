import { useState } from 'react';

interface RegisterProps {
  onRegister: (user: any) => void;
  onSwitchToLogin: () => void;
}

export default function Register({ onRegister, onSwitchToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.name.trim().length < 2) {
      setError('Tên phải có ít nhất 2 ký tự');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          role: formData.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Đăng ký thành công! Đang chuyển hướng...');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setTimeout(() => {
          onRegister(data.user);
        }, 1500);
      } else {
        setError(data.message || 'Đăng ký thất bại');
      }
    } catch (error) {
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎓 Đăng ký</h1>
          <p>Tạo tài khoản OnlineClass mới</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}
          
          <div className="form-group">
            <label>👤 Họ và tên</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập họ và tên đầy đủ"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>📧 Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập địa chỉ email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>👥 Vai trò</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="role-select"
              disabled={loading}
            >
              <option value="student">🎓 Sinh viên</option>
              <option value="teacher">👨🏫 Giáo viên</option>
            </select>
          </div>

          <div className="form-group">
            <label>🔒 Mật khẩu</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>🔒 Xác nhận mật khẩu</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? '⏳ Đang đăng ký...' : '🚀 Đăng ký'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Đã có tài khoản?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={onSwitchToLogin}
              disabled={loading}
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}