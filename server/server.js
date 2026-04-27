const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const http = require("http");
const net = require("net");
const path = require("path");
const https = require("https");
const fs = require("fs");
const socketIo = require("socket.io");
const { ExpressPeerServer } = require("peer");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { hasProfanity, isSpamming } = require("./utils/moderation");
const Attendance = require("./models/Attendance");
const Class = require("./models/Class");
const User = require("./models/User");
require("dotenv").config();

const app = express();
// Remove duplicate server declaration - keep only the conditional one below
const isProduction = process.env.NODE_ENV === "production";
const clientDistPath = path.resolve(__dirname, "../client/dist");
const hasClientBuild = fs.existsSync(clientDistPath);
const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");
const localHttpsMode = (process.env.LOCAL_HTTPS || "auto").toLowerCase();
const localHttpsKeyPath = path.resolve(
  __dirname,
  process.env.LOCAL_HTTPS_KEY_PATH || path.join("certs", "key.pem"),
);
const localHttpsCertPath = path.resolve(
  __dirname,
  process.env.LOCAL_HTTPS_CERT_PATH || path.join("certs", "cert.pem"),
);
const hasLocalHttpsFiles =
  fs.existsSync(localHttpsKeyPath) && fs.existsSync(localHttpsCertPath);
const useLocalHttps =
  localHttpsMode === "true" ||
  (localHttpsMode === "auto" && hasLocalHttpsFiles);

if (localHttpsMode === "true" && !hasLocalHttpsFiles) {
  throw new Error(
    `LOCAL_HTTPS is enabled but the certificate files were not found at ${localHttpsCertPath} and ${localHttpsKeyPath}`,
  );
}

if (localHttpsMode === "auto" && !hasLocalHttpsFiles) {
  console.warn(
    "Local TLS certificates were not found. Falling back to HTTP server mode.",
  );
}

const server = useLocalHttps
  ? https.createServer(
      {
        key: fs.readFileSync(localHttpsKeyPath),
        cert: fs.readFileSync(localHttpsCertPath),
      },
      app,
    )
  : http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!isProduction) return true;
  return allowedOrigins.includes(normalizedOrigin);
};

const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
};

app.set("trust proxy", 1);

// PeerJS Server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/peerjs",
});
app.use(peerServer);

// PeerJS re-emits listen/WebSocket errors via app.emit('error'). Without a listener, Node exits with "Unhandled 'error' event".
peerServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    return;
  }
  console.error("[PeerJS]", err.message);
});

const io = socketIo(server, {
  cors: {
    // Cho phép tất cả origin trong môi trường dev để hỗ trợ truy cập LAN
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP in dev to avoid blocking WebRTC/PeerJS
  }),
);
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});
app.use("/api/", limiter);

// CORS configuration
const corsOptions = {
  // Cho phép tất cả origin trong môi trường dev để hỗ trợ truy cập LAN
  origin: corsOrigin,
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/classes", require("./routes/classes"));
app.use("/api/lectures", require("./routes/lectures"));
app.use("/api/assignments", require("./routes/assignments"));
app.use("/api/students", require("./routes/students"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/activities", require("./routes/activities"));

if (hasClientBuild) {
  app.use(express.static(clientDistPath));

  app.get(/^(?!\/(?:api|uploads|socket\.io|peerjs|health)\b).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io
const rooms = new Map(); // classId -> Map(socketId -> playerData)
const classroomSpawnPoints = [
  { x: 104, y: 600, direction: 0 },
  { x: 144, y: 600, direction: 0 },
  { x: 184, y: 600, direction: 0 },
  { x: 224, y: 600, direction: 0 },
  { x: 104, y: 552, direction: 0 },
  { x: 144, y: 552, direction: 0 },
  { x: 184, y: 552, direction: 0 },
  { x: 224, y: 552, direction: 0 },
];

const getSpawnPoint = (roomPlayers) => {
  const occupiedSpawns = new Set(
    Array.from(roomPlayers.values()).map((player) => `${player.x}:${player.y}`),
  );

  const availableSpawn = classroomSpawnPoints.find(
    (spawn) => !occupiedSpawns.has(`${spawn.x}:${spawn.y}`),
  );

  return (
    availableSpawn ||
    classroomSpawnPoints[roomPlayers.size % classroomSpawnPoints.length]
  );
};

io.on("connection", (socket) => {
  console.log(
    "Socket.IO: User connected:",
    socket.id,
    "from:",
    socket.handshake.address,
  );
  console.log("Socket.IO: Connection details:", {
    transport: socket.conn.transport.name,
    upgraded: socket.conn.upgraded,
    remoteAddress: socket.handshake.address,
  });

  // Join user room for notifications
  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  // Handle classroom movement
  socket.on("join_classroom", async ({ classId, user }) => {
    socket.join(`class_${classId}`);

    if (!rooms.has(classId)) {
      rooms.set(classId, new Map());
    }

    // AI Automatic Attendance
    if (user && user.role !== "teacher") {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let realUserId = user.dbId || user.id;

        // Nếu không có ID nhưng có MSSV, tìm User theo MSSV
        if (!realUserId && user.mssv) {
          const foundUser = await User.findOne({ mssv: user.mssv });
          if (foundUser) {
            realUserId = foundUser._id;
          }
        }

        // Cập nhật MSSV cho User nếu đã có ID nhưng chưa có MSSV (hoặc cập nhật MSSV mới)
        if (realUserId && user.mssv) {
          await User.findByIdAndUpdate(realUserId, { mssv: user.mssv });
        }

        if (realUserId) {
          // Check if already attended today
          const existingAttendance = await Attendance.findOne({
            class: classId,
            student: realUserId,
            date: { $gte: today },
          });

          if (!existingAttendance) {
            const classData = await Class.findById(classId).populate('students', 'mssv');
            
            // AI đối soát bằng MSSV: Kiểm tra xem MSSV nhập vào có nằm trong danh sách MSSV của lớp không
            const isInClassList = classData && classData.students.some(s => s.mssv === user.mssv);

            if (isInClassList) {
              await Attendance.create({
                class: classId,
                student: realUserId,
                date: today,
                status: "present",
                joinedAt: new Date(),
              });

              console.log(`AI Attendance Auto: Marked ${user.name} (MSSV: ${user.mssv}) as present`);

              socket.emit("new_message", {
                id: `system-attendance-auto-${Date.now()}`,
                sender: "Hệ thống AI",
                content: `[TỰ ĐỘNG] Xác nhận: Sinh viên ${user.name} (MSSV: ${user.mssv}) đã được điểm danh thành công!`,
                timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                type: "system",
              });
            } else {
              console.log(`AI Attendance: MSSV ${user.mssv} not found in class ${classId}`);
            }
          }
        } else {
          console.log(`AI Attendance: Could not find user with MSSV ${user.mssv}`);
        }
      } catch (err) {
        console.error("AI Auto Attendance Error:", err);
      }
    }

    const roomPlayers = rooms.get(classId);
    const spawnPoint = getSpawnPoint(roomPlayers);

    const playerData = {
      id: socket.id,
      userId: user.dbId || user.id,
      mssv: user.mssv || "",
      name: user.name,
      avatar: user.avatar || "adam",
      peerId: user.peerId, // Lưu Peer ID để WebRTC có thể gọi
      role: user.role === "teacher" ? "teacher" : "student",
      x: spawnPoint.x,
      y: spawnPoint.y,
      frame: 0,
      direction: spawnPoint.direction,
      isMoving: false,
      isSitting: false,
      isTalking: false, // Trạng thái Mic mặc định
      isCamOn: Boolean(user.isCamOn),
      isMicOn: Boolean(user.isMicOn),
    };

    roomPlayers.set(socket.id, playerData);

    // Send current players in room to the new player
    const playersInRoom = Array.from(roomPlayers.values());
    socket.emit("current_players", playersInRoom);

    // Notify others about new player
    socket.to(`class_${classId}`).emit("player_joined", playerData);

    console.log(`User ${user.name} joined classroom: ${classId}`);
  });

  socket.on(
    "move",
    ({ classId, x, y, frame, direction, isMoving, isSitting, isTalking }) => {
      const room = rooms.get(classId);
      if (room && room.has(socket.id)) {
        const playerData = room.get(socket.id);
        playerData.x = x;
        playerData.y = y;
        playerData.frame = frame;
        playerData.direction = direction;
        playerData.isMoving = isMoving;
        playerData.isSitting = Boolean(isSitting);
        playerData.isTalking = isTalking; // Cập nhật trạng thái nói cho các máy khác thấy icon

        // Broadcast movement to others in the room
        socket.to(`class_${classId}`).emit("player_moved", playerData);
      }
    },
  );

  socket.on("update_media_state", ({ classId, isCamOn, isMicOn }) => {
    const room = rooms.get(classId);
    if (!room || !room.has(socket.id)) return;

    const playerData = room.get(socket.id);
    playerData.isCamOn = Boolean(isCamOn);
    playerData.isMicOn = Boolean(isMicOn);

    io.to(`class_${classId}`).emit("player_media_updated", playerData);
  });

  socket.on(
    "teacher_media_control",
    ({ classId, targetSocketId, mediaType, enabled }) => {
      const room = rooms.get(classId);
      if (!room) return;

      const requester = room.get(socket.id);
      const targetPlayer = room.get(targetSocketId);

      if (!requester || requester.role !== "teacher") {
        socket.emit("teacher_media_control_error", {
          message:
            "Chỉ giáo viên mới có quyền điều khiển cam và mic của học sinh.",
        });
        return;
      }

      if (!targetPlayer || targetPlayer.role !== "student") {
        socket.emit("teacher_media_control_error", {
          message: "Chỉ có thể điều khiển cam và mic của học sinh trong lớp.",
        });
        return;
      }

      if (!["camera", "microphone"].includes(mediaType)) {
        socket.emit("teacher_media_control_error", {
          message: "Loại điều khiển media không hợp lệ.",
        });
        return;
      }

      io.to(targetSocketId).emit("teacher_media_command", {
        teacherSocketId: socket.id,
        teacherName: requester.name,
        mediaType,
        enabled: Boolean(enabled),
      });
    },
  );

  socket.on(
    "teacher_media_control_result",
    ({
      classId,
      teacherSocketId,
      targetSocketId,
      mediaType,
      enabled,
      success,
      message,
    }) => {
      const room = rooms.get(classId);
      if (!room) return;

      const teacher = room.get(teacherSocketId);
      const targetPlayer = room.get(targetSocketId);

      if (!teacher || teacher.role !== "teacher" || !targetPlayer) return;

      io.to(teacherSocketId).emit("teacher_media_control_result", {
        targetSocketId,
        targetName: targetPlayer.name,
        mediaType,
        enabled: Boolean(enabled),
        success: Boolean(success),
        message,
      });
    },
  );

  socket.on("send_message", async ({ classId, message }) => {
    const room = rooms.get(classId);
    if (!room) return;

    const player = room.get(socket.id);
    if (!player) return;

    // AI Content Moderation
    if (hasProfanity(message.content)) {
      socket.emit("new_message", {
        id: `system-${Date.now()}`,
        sender: "Hệ thống AI",
        content: "Tin nhắn của bạn chứa từ ngữ không phù hợp và đã bị chặn.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        type: "system",
      });
      return;
    }

    if (isSpamming(player.userId, message.content)) {
      socket.emit("new_message", {
        id: `system-${Date.now()}`,
        sender: "Hệ thống AI",
        content: "Bạn đang gửi tin nhắn quá nhanh hoặc bị trùng lặp. Vui lòng thử lại sau.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        type: "system",
      });
      return;
    }

    // AI Attendance via Chat
    const attendanceRegex = /điểm danh\s+(.+)\s+(\d+)/i;
    const match = message.content.match(attendanceRegex);
    if (match && player.role !== "teacher") {
      const studentName = match[1].trim();
      const studentIdStr = match[2].trim();

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
          class: classId,
          student: player.userId,
          date: { $gte: today },
        });

        if (!existingAttendance) {
          const classData = await Class.findById(classId);
          if (classData && classData.students.includes(player.userId)) {
            await Attendance.create({
              class: classId,
              student: player.userId,
              date: today,
              status: "present",
              joinedAt: new Date(),
            });

            socket.emit("new_message", {
              id: `system-attendance-success-${Date.now()}`,
              sender: "Hệ thống AI",
              content: `Xác nhận: Sinh viên ${studentName} (MSSV: ${studentIdStr}) đã điểm danh thành công!`,
              timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
              type: "system",
            });
            return; // Don't broadcast the attendance message to everyone if preferred, or continue to show it
          }
        } else {
          socket.emit("new_message", {
            id: `system-attendance-already-${Date.now()}`,
            sender: "Hệ thống AI",
            content: `Bạn đã điểm danh cho ngày hôm nay rồi.`,
            timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            type: "system",
          });
          return;
        }
      } catch (err) {
        console.error("Chat Attendance Error:", err);
      }
    }

    // Broadcast message to everyone in the room (including sender if needed, but usually handled by client)
    io.to(`class_${classId}`).emit("new_message", message);
  });

  // Screen sharing events
  socket.on("start_screen_share", ({ classId, sharerName, sharerRole }) => {
    console.log(`${sharerName} started screen sharing in ${classId}`);
    // Thông báo cho tất cả người khác trong phòng
    socket.to(`class_${classId}`).emit("screen_share_started", {
      sharerSocketId: socket.id,
      sharerName,
      sharerRole,
    });
  });

  socket.on("stop_screen_share", ({ classId }) => {
    console.log(`Screen sharing stopped in ${classId}`);
    // Thông báo cho tất cả người khác trong phòng
    socket.to(`class_${classId}`).emit("screen_share_stopped", {
      sharerSocketId: socket.id,
    });
  });

  // WebRTC signaling cho screen share
  socket.on("screen_share_offer", ({ classId, targetSocketId, offer }) => {
    io.to(targetSocketId).emit("screen_share_offer", {
      sharerSocketId: socket.id,
      offer,
    });
  });

  socket.on("screen_share_answer", ({ classId, sharerSocketId, answer }) => {
    io.to(sharerSocketId).emit("screen_share_answer", {
      viewerSocketId: socket.id,
      answer,
    });
  });

  socket.on(
    "screen_share_ice_candidate",
    ({ classId, targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("screen_share_ice_candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    },
  );

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    // Find and remove player from any room
    for (const [classId, players] of rooms.entries()) {
      if (players.has(socket.id)) {
        const player = players.get(socket.id);
        
        // Tăng số lần thoát ra cho sinh viên nếu đã được điểm danh
        if (player.role === "student") {
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await Attendance.findOneAndUpdate(
              {
                class: classId,
                student: player.userId,
                date: { $gte: today }
              },
              { $inc: { leaveCount: 1 } }
            );
          } catch (err) {
            console.error("Error updating leave count:", err);
          }
        }

        players.delete(socket.id);
        io.to(`class_${classId}`).emit("player_left", socket.id);
      }
    }
  });
});

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

connectDB();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  server.close(() => {
    console.log("Process terminated");
    mongoose.connection.close();
  });
});

const preferredPort = Number(process.env.PORT) || 5000;
const maxPortAttempts = isProduction ? 1 : 25;

/** Try binding a throwaway TCP server to see if the port is free (avoids repeated server.listen() on the same http.Server). */
const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer();
    const finish = (available) => {
      tester.removeAllListeners();
      try {
        tester.close(() => resolve(available));
      } catch {
        resolve(available);
      }
    };
    tester.once("error", () => finish(false));
    tester.listen(port, "0.0.0.0", () => finish(true));
  });

const pickListenPort = async () => {
  for (let i = 0; i < maxPortAttempts; i++) {
    const port = preferredPort + i;
    if (await isPortAvailable(port)) {
      if (i > 0) {
        console.warn(
          `[WARN] Port ${preferredPort} is busy; using ${port} instead.`,
        );
        console.warn(
          `  If the frontend cannot reach the API, set in client/.env.local:\n` +
            `  VITE_BACKEND_URL=http://localhost:${port}\n`,
        );
      }
      return port;
    }
  }
  console.error(
    `\n[ERROR] Could not bind to a port after ${maxPortAttempts} attempt(s) starting at ${preferredPort}.`,
  );
  console.error(
    `  Windows: netstat -ano | findstr :${preferredPort}   then   taskkill /PID <pid> /F\n`,
  );
  process.exit(1);
  return preferredPort;
};

(async () => {
  const listenPort = await pickListenPort();

  server.once("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });

  server.listen(listenPort, "0.0.0.0", () => {
    console.log(`Server listening on port ${listenPort}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(
      `Server protocol: ${useLocalHttps ? "HTTPS (local certificate)" : "HTTP"}`,
    );
    if (allowedOrigins.length > 0) {
      console.log(`Allowed client origins: ${allowedOrigins.join(", ")}`);
    }
    if (hasClientBuild) {
      console.log(`Serving client build from: ${clientDistPath}`);
    }
  });
})();

server.on("clientError", (err, socket) => {
  console.error("Client error:", err.message);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

module.exports = { app, io };
