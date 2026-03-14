import { useState } from 'react';

interface LoginProps {
  onLogin: (user: any) => void;
  onSwitchToRegister: () => void;
}

export default function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Đăng nhập</h1>
          <p>Chào mừng trở lại với OnlineClass</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email của bạn"
              required
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Chưa có tài khoản?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={onSwitchToRegister}
            >
              Đăng ký ngay
            </button>
          </p>
        </div>

        <div className="demo-accounts">
          <h4>Tài khoản demo:</h4>
          <div className="demo-item">
            <strong>Giáo viên:</strong> teacher@example.com / password123
          </div>
          <div className="demo-item">
            <strong>Sinh viên:</strong> student1@example.com / password123
          </div>
        </div>
      </div>
    </div>
  );
}