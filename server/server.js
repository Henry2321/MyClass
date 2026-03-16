const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const { ExpressPeerServer } = require('peer');
const { errorHandler, notFound } = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// PeerJS Server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});
app.use(peerServer);

const io = socketIo(server, {
  cors: {
    // Cho phép tất cả origin trong môi trường dev để hỗ trợ truy cập LAN
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in dev to avoid blocking WebRTC/PeerJS
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  // Cho phép tất cả origin trong môi trường dev để hỗ trợ truy cập LAN
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true,
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/students', require('./routes/students'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activities', require('./routes/activities'));

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io
const rooms = new Map(); // classId -> Map(socketId -> playerData)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user room for notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });
  
  // Handle classroom movement
  socket.on('join_classroom', ({ classId, user }) => {
    socket.join(`class_${classId}`);
    
    if (!rooms.has(classId)) {
      rooms.set(classId, new Map());
    }
    
    const playerData = {
      id: socket.id,
      userId: user.id,
      name: user.name,
      avatar: user.avatar || 'adam',
      peerId: user.peerId, // Lưu Peer ID để WebRTC có thể gọi
      x: 400,
      y: 400,
      frame: 0,
      direction: 0,
      isMoving: false,
      isTalking: false // Trạng thái Mic mặc định
    };
    
    rooms.get(classId).set(socket.id, playerData);
    
    // Send current players in room to the new player
    const playersInRoom = Array.from(rooms.get(classId).values());
    socket.emit('current_players', playersInRoom);
    
    // Notify others about new player
    socket.to(`class_${classId}`).emit('player_joined', playerData);
    
    console.log(`User ${user.name} joined classroom: ${classId}`);
  });

  socket.on('move', ({ classId, x, y, frame, direction, isMoving, isTalking }) => {
    const room = rooms.get(classId);
    if (room && room.has(socket.id)) {
      const playerData = room.get(socket.id);
      playerData.x = x;
      playerData.y = y;
      playerData.frame = frame;
      playerData.direction = direction;
      playerData.isMoving = isMoving;
      playerData.isTalking = isTalking; // Cập nhật trạng thái nói cho các máy khác thấy icon
      
      // Broadcast movement to others in the room
      socket.to(`class_${classId}`).emit('player_moved', playerData);
    }
  });

  socket.on('send_message', ({ classId, message }) => {
    // Broadcast message to everyone in the room (including sender if needed, but usually handled by client)
    io.to(`class_${classId}`).emit('new_message', message);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find and remove player from any room
    rooms.forEach((players, classId) => {
      if (players.has(socket.id)) {
        players.delete(socket.id);
        io.to(`class_${classId}`).emit('player_left', socket.id);
      }
    });
  });
});

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

connectDB();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };