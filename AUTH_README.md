# Hệ thống Đăng nhập/Đăng ký OnlineClass

## Tính năng

✅ **Đăng ký tài khoản** với 2 vai trò:
- 🎓 **Sinh viên** (Student)
- 👨🏫 **Giáo viên** (Teacher)

✅ **Đăng nhập** với xác thực JWT
✅ **Validation** đầy đủ (email, mật khẩu, tên)
✅ **Giao diện đẹp** với CSS hiện đại
✅ **Thông báo lỗi** bằng tiếng Việt
✅ **Tài khoản demo** để test

## Cách chạy

### 1. Backend (Server)
```bash
cd server
npm install
npm run seed:enhanced  # Tạo dữ liệu demo
npm run dev            # Chạy server
```

### 2. Frontend (Client)
```bash
cd client
npm install
npm run dev           # Chạy client
```

## Tài khoản Demo

### Giáo viên:
- **Email:** teacher@example.com
- **Password:** password123

- **Email:** teacher2@example.com  
- **Password:** password123

### Sinh viên:
- **Email:** student1@example.com
- **Password:** password123

- **Email:** student2@example.com
- **Password:** password123

- **Email:** student3@example.com
- **Password:** password123

- **Email:** student4@example.com
- **Password:** password123

## Cấu trúc Database

### User Model:
```javascript
{
  name: String,           // Tên đầy đủ
  email: String,          // Email (unique)
  password: String,       // Mật khẩu đã hash
  role: String,           // 'teacher' hoặc 'student'
  avatar: String,         // URL avatar (optional)
  isActive: Boolean,      // Trạng thái tài khoản
  lastLogin: Date,        // Lần đăng nhập cuối
  createdAt: Date,        // Ngày tạo
  updatedAt: Date         // Ngày cập nhật
}
```

## API Endpoints

### Authentication:
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập  
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất

## Validation Rules

### Đăng ký:
- **Tên:** Ít nhất 2 ký tự
- **Email:** Định dạng email hợp lệ, không trùng
- **Mật khẩu:** Ít nhất 6 ký tự
- **Vai trò:** Phải là 'teacher' hoặc 'student'

### Đăng nhập:
- **Email:** Định dạng hợp lệ
- **Mật khẩu:** Ít nhất 6 ký tự

## Bảo mật

✅ **Mật khẩu hash** với bcrypt (salt rounds: 12)
✅ **JWT Token** với thời hạn 7 ngày
✅ **Input validation** và sanitization
✅ **Error handling** toàn diện
✅ **CORS** được cấu hình
✅ **Rate limiting** (nếu cần)

## Giao diện

- **Responsive design** 
- **Gradient background** đẹp mắt
- **Animation** mượt mà
- **Icon emoji** sinh động
- **Loading states** 
- **Error/Success messages**
- **Form validation** real-time

## Công nghệ sử dụng

### Backend:
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs
- CORS

### Frontend:
- React + TypeScript
- CSS3 với Flexbox/Grid
- Context API cho state management
- Fetch API cho HTTP requests

## Lưu ý

1. **Environment Variables:** Đảm bảo file `.env` có đầy đủ thông tin
2. **MongoDB:** Cần kết nối MongoDB (local hoặc Atlas)
3. **Port:** Server chạy port 5000, Client chạy port 5173
4. **CORS:** Đã cấu hình cho localhost

## Troubleshooting

### Lỗi kết nối MongoDB:
- Kiểm tra MONGODB_URI trong .env
- Đảm bảo MongoDB đang chạy

### Lỗi CORS:
- Kiểm tra URL trong fetch requests
- Đảm bảo server đang chạy

### Lỗi JWT:
- Kiểm tra JWT_SECRET trong .env
- Clear localStorage nếu token hết hạn