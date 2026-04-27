const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const http = require("http");
const path = require("path");
const https = require("https");
const fs = require("fs");
const socketIo = require("socket.io");
const { ExpressPeerServer } = require("peer");
const { errorHandler, notFound } = require("./middleware/errorHandler");
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
  path: '/peerjs',
  corsOptions: {
    origin: corsOrigin,
    credentials: true
  }
});
app.use(peerServer);

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
const activeScreenShares = new Map(); // classId -> { sharerSocketId, sharerName, sharerRole }
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
  socket.on("join_classroom", ({ classId, user }) => {
    socket.join(`class_${classId}`);

    if (!rooms.has(classId)) {
      rooms.set(classId, new Map());
    }

    const roomPlayers = rooms.get(classId);
    const spawnPoint = getSpawnPoint(roomPlayers);

    const playerData = {
      id: socket.id,
      userId: user.id,
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

    // Nếu đang có screen share, thông báo cho player mới
    const activeShare = activeScreenShares.get(classId);
    if (activeShare) {
      socket.emit("screen_share_started", activeShare);
      // Yêu cầu sharer gửi offer cho player mới
      io.to(activeShare.sharerSocketId).emit("screen_share_request_offer", {
        viewerSocketId: socket.id,
      });
    }

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

  socket.on('stream_updated', ({ classId }) => {
    const room = rooms.get(classId)
    if (!room || !room.has(socket.id)) return
    const player = room.get(socket.id)
    // Thông báo cho tất cả người khác trong phòng biết peer này có stream mới
    socket.to(`class_${classId}`).emit('peer_stream_updated', {
      peerId: `peer-${socket.id}`,
      socketId: socket.id
    })
  })

  socket.on("send_message", ({ classId, message }) => {
    // Broadcast message to everyone in the room (including sender if needed, but usually handled by client)
    io.to(`class_${classId}`).emit("new_message", message);
  });

  // Screen sharing events
  socket.on("start_screen_share", ({ classId, sharerName, sharerRole }) => {
    console.log(`${sharerName} started screen sharing in ${classId}`);
    // Lưu trạng thái share để player mới join biết
    activeScreenShares.set(classId, {
      sharerSocketId: socket.id,
      sharerName,
      sharerRole,
    });
    socket.to(`class_${classId}`).emit("screen_share_started", {
      sharerSocketId: socket.id,
      sharerName,
      sharerRole,
    });
  });

  socket.on("stop_screen_share", ({ classId }) => {
    console.log(`Screen sharing stopped in ${classId}`);
    activeScreenShares.delete(classId);
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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    rooms.forEach((players, classId) => {
      if (players.has(socket.id)) {
        players.delete(socket.id);
        io.to(`class_${classId}`).emit("player_left", socket.id);
        // Nếu người disconnect là sharer thì xóa active share
        const activeShare = activeScreenShares.get(classId);
        if (activeShare && activeShare.sharerSocketId === socket.id) {
          activeScreenShares.delete(classId);
          io.to(`class_${classId}`).emit("screen_share_stopped", {
            sharerSocketId: socket.id,
          });
        }
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTPS Server running on port ${PORT}`);
  console.log(`Server URL: https://26.140.16.205:${PORT}`);
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

  // Keep-alive: tự ping để Render free tier không bị sleep
  if (isProduction && process.env.RENDER_EXTERNAL_URL) {
    const keepAliveUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
    setInterval(() => {
      const protocol = keepAliveUrl.startsWith('https') ? require('https') : require('http');
      protocol.get(keepAliveUrl, (res) => {
        console.log(`Keep-alive ping: ${res.statusCode}`);
      }).on('error', (err) => {
        console.warn('Keep-alive ping failed:', err.message);
      });
    }, 14 * 60 * 1000); // 14 phút
  }
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});

server.on("clientError", (err, socket) => {
  console.error("Client error:", err.message);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

module.exports = { app, io };
