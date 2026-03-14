# OnlineClass Backend

Backend API cho hệ thống quản lý lớp học trực tuyến OnlineClass.

## Công nghệ sử dụng

- **Node.js** + **Express.js** - Web framework
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **Multer** - File upload
- **bcryptjs** - Password hashing

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` và cấu hình:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/onlineclass
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

3. Khởi động MongoDB server

4. Chạy server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Classes
- `GET /api/classes` - Lấy danh sách lớp học
- `POST /api/classes` - Tạo lớp học mới (teacher)
- `POST /api/classes/join` - Tham gia lớp học (student)
- `GET /api/classes/:id` - Lấy chi tiết lớp học

### Lectures
- `GET /api/lectures/class/:classId` - Lấy bài giảng theo lớp
- `POST /api/lectures` - Tạo bài giảng (teacher)
- `PATCH /api/lectures/:id/publish` - Xuất bản bài giảng

### Assignments
- `GET /api/assignments/class/:classId` - Lấy bài tập theo lớp
- `POST /api/assignments` - Tạo bài tập (teacher)
- `POST /api/assignments/:id/submit` - Nộp bài tập (student)
- `PATCH /api/assignments/:id/grade/:submissionId` - Chấm điểm (teacher)

### Students
- `GET /api/students` - Lấy danh sách sinh viên (teacher)
- `GET /api/students/class/:classId` - Lấy sinh viên theo lớp
- `DELETE /api/students/class/:classId/student/:studentId` - Xóa sinh viên khỏi lớp

### Dashboard
- `GET /api/dashboard/stats` - Thống kê tổng quan
- `GET /api/dashboard/assignments/today` - Bài tập hôm nay
- `GET /api/dashboard/activities` - Hoạt động gần đây
- `GET /api/dashboard/schedule` - Lịch học hôm nay

## Cấu trúc thư mục

```
server/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── uploads/         # File uploads
├── .env            # Environment variables
├── server.js       # Main server file
└── package.json    # Dependencies
```

## Roles

- **Teacher**: Tạo lớp, bài giảng, bài tập, chấm điểm
- **Student**: Tham gia lớp, xem bài giảng, nộp bài tập

## File Upload

- Bài giảng: `/uploads/lectures/`
- Bài tập: `/uploads/assignments/`
- Truy cập: `http://localhost:5000/uploads/...`