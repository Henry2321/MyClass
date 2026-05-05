import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ClassroomChat from "./ClassroomChat";
// @ts-ignore
import * as XLSX from "xlsx";
import { getApiUrl } from "../utils/api";

interface ScreenShareState {
  isSharing: boolean;
  sharerName: string;
  sharerRole: "teacher" | "student";
  stream: MediaStream | null;
  sharerSocketId?: string; // Thêm để track người share
  isViewing?: boolean; // Thêm để biết mình đang xem hay share
}

type ClassroomRole = "teacher" | "student";
type MediaType = "camera" | "microphone";
type MediaToggleSource = "self" | "teacher";

interface ClassroomPlayer {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  peerId?: string;
  role: ClassroomRole;
  x: number;
  y: number;
  frame: number;
  direction: number;
  isMoving: boolean;
  isSitting: boolean;
  isTalking: boolean;
  isCamOn: boolean;
  isMicOn: boolean;
}

interface MediaNotice {
  text: string;
  tone: "info" | "success" | "error";
}

interface SeatPosition {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  direction: number;
}

interface SeatActionUi {
  canSit: boolean;
  isSitting: boolean;
  canShare: boolean;
  shareLabel: string;
}

const CHAIR_SEAT_TILES = [4485, 4486, 4501, 4502];
const LEFT_FACING_CHAIR_TILES = [4485, 4501];
const SIT_RANGE = 48;
const SEAT_Y_OFFSET = 8;

import { useSocket } from "../contexts/SocketContext";
import { useVoice } from "../contexts/VoiceContext";

interface ClassCanvasProps {
  classId: string;
}

export default function ClassCanvas({ classId }: ClassCanvasProps) {
  const { socket } = useSocket();
  // @ts-ignore
  const {
    peer,
    myStream,
    setMyStream,
    isPushingToTalk,
    setIsPushingToTalk,
    remoteStreams,
    makeCall,
  } = useVoice();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sử dụng useRef cho PTT để tránh stale closure trong game loop
  const isTalkingRef = useRef(false);
  useEffect(() => {
    isTalkingRef.current = isPushingToTalk;
  }, [isPushingToTalk]);
  const [isJoined, setIsJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [studentId, setStudentId] = useState("");
  const { user } = useAuth();
  const teacherCharacter = "adam";
  const studentCharacters = ["ash", "lucy", "nancy"];

  const getStudentAvatarIndex = (avatar?: string) => {
    const index = studentCharacters.indexOf(avatar || "");
    return index >= 0 ? index : 0;
  };

  const [selectedCharIndex, setSelectedCharIndex] = useState(() =>
    getStudentAvatarIndex(user?.avatar),
  );

  const [screenShare, setScreenShare] = useState<ScreenShareState>({
    isSharing: false,
    sharerName: "",
    sharerRole: "student",
    stream: null,
    sharerSocketId: "",
    isViewing: false,
  });
  const screenShareRef = useRef<ScreenShareState>({
    isSharing: false,
    sharerName: "",
    sharerRole: "student",
    stream: null,
    sharerSocketId: "",
    isViewing: false,
  });
  // Media state cho cam/mic preview
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const isCamOnRef = useRef(false);
  const isMicOnRef = useRef(false);
  const isJoinedRef = useRef(false);

  // Mouse movement state
  const [targetPosition, setTargetPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isMovingToTarget, setIsMovingToTarget] = useState(false);
  const targetPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isMovingToTargetRef = useRef(false);

  // Chat state
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [participantRoster, setParticipantRoster] = useState<ClassroomPlayer[]>(
    [],
  );
  const [mediaNotice, setMediaNotice] = useState<MediaNotice | null>(null);
  const [isTeacherControlsVisible, setIsTeacherControlsVisible] =
    useState(true);
  const [seatActionUi, setSeatActionUi] = useState<SeatActionUi>({
    canSit: false,
    isSitting: false,
    canShare: true,
    shareLabel: "Chia sẻ màn hình",
  });
  // Screen sharing WebRTC connections
  const screenShareConnections = useRef<Map<string, RTCPeerConnection>>(
    new Map(),
  );
  const [, setIsReceivingScreenShare] = useState(false);

  const seatActionUiRef = useRef<SeatActionUi>({
    canSit: false,
    isSitting: false,
    canShare: true,
    shareLabel: "Chia sẻ màn hình",
  });
  const userNameRef = useRef("");
  const userRoleRef = useRef<ClassroomRole>("student");

  const stopMouseMovement = () => {
    targetPositionRef.current = null;
    isMovingToTargetRef.current = false;
    setTargetPosition(null);
    setIsMovingToTarget(false);
  };

  useEffect(() => {
    targetPositionRef.current = targetPosition;
    isMovingToTargetRef.current = isMovingToTarget;
  }, [targetPosition, isMovingToTarget]);

  useEffect(() => {
    screenShareRef.current = screenShare;
  }, [screenShare]);

  useEffect(() => {
    localStreamRef.current = localStream;
    myStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    isCamOnRef.current = isCamOn;
  }, [isCamOn]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    userRoleRef.current = user?.role === "teacher" ? "teacher" : "student";
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === "student" && user?.avatar) {
      setSelectedCharIndex(getStudentAvatarIndex(user.avatar));
    }
  }, [user?.avatar, user?.role]);

  useEffect(() => {
    seatActionUiRef.current = seatActionUi;
  }, [seatActionUi]);

  useEffect(() => {
    if (isJoined) {
      emitMediaState(isCamOnRef.current, isMicOnRef.current);
    }
  }, [isJoined, socket]);

  useEffect(() => {
    if (!mediaNotice) return;

    const timer = window.setTimeout(() => {
      setMediaNotice(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [mediaNotice]);

  const showMediaNotice = (
    text: string,
    tone: MediaNotice["tone"] = "info",
  ) => {
    setMediaNotice({ text, tone });
  };

  const getCanShareScreen = () => {
    const activeShare = screenShareRef.current;
    const currentUserName = userNameRef.current;
    const currentUserRole = userRoleRef.current;

    return (
      !activeShare.isSharing ||
      activeShare.sharerName === currentUserName ||
      (currentUserRole === "teacher" && activeShare.sharerRole === "student")
    );
  };

  const getShareActionLabel = () => {
    const activeShare = screenShareRef.current;
    const currentUserName = userNameRef.current;
    const currentUserRole = userRoleRef.current;

    if (activeShare.isSharing && activeShare.sharerName === currentUserName) {
      return "Dừng chia sẻ";
    }

    if (
      activeShare.isSharing &&
      currentUserRole === "teacher" &&
      activeShare.sharerRole === "student"
    ) {
      return "Chiếm quyền chia sẻ";
    }

    return "Chia sẻ màn hình";
  };

  const syncSeatActionUi = () => {
    const nextState: SeatActionUi = {
      canSit: canSit.current,
      isSitting: isSitting.current,
      canShare: getCanShareScreen(),
      shareLabel: getShareActionLabel(),
    };

    const previousState = seatActionUiRef.current;
    if (
      previousState.canSit !== nextState.canSit ||
      previousState.isSitting !== nextState.isSitting ||
      previousState.canShare !== nextState.canShare ||
      previousState.shareLabel !== nextState.shareLabel
    ) {
      seatActionUiRef.current = nextState;
      setSeatActionUi(nextState);
    }
  };

  const emitMediaState = (nextCamOn: boolean, nextMicOn: boolean) => {
    if (!socket || !isJoinedRef.current) return;

    socket.emit("update_media_state", {
      classId: classId,
      isCamOn: nextCamOn,
      isMicOn: nextMicOn,
    });
  };

  const applyLocalMediaState = (
    nextStream: MediaStream | null,
    nextCamOn: boolean,
    nextMicOn: boolean,
  ) => {
    localStreamRef.current = nextStream;
    isCamOnRef.current = nextCamOn;
    isMicOnRef.current = nextMicOn;

    setLocalStream(nextStream);
    setIsCamOn(nextCamOn);
    setIsMicOn(nextMicOn);

    if (!nextMicOn) {
      setIsPushingToTalk(false);
    }

    emitMediaState(nextCamOn, nextMicOn);
  };

  const buildLocalStream = (
    audioTracks: MediaStreamTrack[],
    videoTracks: MediaStreamTrack[],
  ) => {
    const tracks = [...audioTracks, ...videoTracks];
    return tracks.length > 0 ? new MediaStream(tracks) : null;
  };

  const getCameraErrorMessage = (err: any) => {
    if (err?.name === "NotAllowedError") {
      return "Bạn đã từ chối quyền truy cập camera. Vui lòng cho phép camera rồi thử lại.";
    }
    if (err?.name === "NotFoundError") {
      return "Không tìm thấy camera. Vui lòng kiểm tra thiết bị camera.";
    }
    if (err?.name === "NotReadableError") {
      return "Camera đang được sử dụng bởi ứng dụng khác.";
    }
    if (err?.name === "OverconstrainedError") {
      return "Cấu hình camera hiện tại không được thiết bị hỗ trợ.";
    }
    return `Lỗi camera: ${err?.message || "Không xác định"}`;
  };

  const getMicErrorMessage = (err: any) => {
    if (err?.name === "NotAllowedError") {
      return "Bạn đã từ chối quyền truy cập microphone. Vui lòng cho phép microphone rồi thử lại.";
    }
    if (err?.name === "NotFoundError") {
      return "Không tìm thấy microphone. Vui lòng kiểm tra thiết bị âm thanh.";
    }
    if (err?.name === "NotReadableError") {
      return "Microphone đang được sử dụng bởi ứng dụng khác.";
    }
    return `Lỗi microphone: ${err?.message || "Không thể truy cập microphone!"}`;
  };

  const setCameraEnabled = async (
    enabled: boolean,
    source: MediaToggleSource = "self",
  ) => {
    const currentStream = localStreamRef.current;

    if (enabled === isCamOnRef.current) {
      return { success: true as const };
    }

    if (!enabled) {
      currentStream?.getVideoTracks().forEach((track) => track.stop());

      const nextAudioTracks = currentStream?.getAudioTracks() || [];
      const nextStream = buildLocalStream(nextAudioTracks, []);
      applyLocalMediaState(nextStream, false, nextAudioTracks.length > 0);
      return { success: true as const };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
        },
        audio: false,
      });

      const nextAudioTracks = currentStream?.getAudioTracks() || [];
      const nextStream = buildLocalStream(
        nextAudioTracks,
        stream.getVideoTracks(),
      );
      applyLocalMediaState(nextStream, true, nextAudioTracks.length > 0);
      return { success: true as const };
    } catch (err: any) {
      const message = getCameraErrorMessage(err);
      console.error("Lỗi bật camera:", err);

      if (source === "teacher") {
        showMediaNotice(
          `Giáo viên yêu cầu bật camera nhưng không thành công: ${message}`,
          "error",
        );
      } else {
        alert(message);
      }

      return { success: false as const, message };
    }
  };

  const setMicEnabled = async (
    enabled: boolean,
    source: MediaToggleSource = "self",
  ) => {
    const currentStream = localStreamRef.current;

    if (enabled === isMicOnRef.current) {
      return { success: true as const };
    }

    if (!enabled) {
      currentStream?.getAudioTracks().forEach((track) => track.stop());

      const nextVideoTracks = currentStream?.getVideoTracks() || [];
      const nextStream = buildLocalStream([], nextVideoTracks);
      applyLocalMediaState(nextStream, nextVideoTracks.length > 0, false);
      return { success: true as const };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const nextVideoTracks = currentStream?.getVideoTracks() || [];
      const nextStream = buildLocalStream(
        stream.getAudioTracks(),
        nextVideoTracks,
      );
      applyLocalMediaState(nextStream, nextVideoTracks.length > 0, true);
      return { success: true as const };
    } catch (err: any) {
      const message = getMicErrorMessage(err);
      console.error("Lỗi bật mic:", err);

      if (source === "teacher") {
        showMediaNotice(
          `Giáo viên yêu cầu bật microphone nhưng không thành công: ${message}`,
          "error",
        );
      } else {
        alert(message);
      }

      return { success: false as const, message };
    }
  };

  const toggleCamera = async () => {
    // Kiểm tra browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Trình duyệt không hỗ trợ camera. Cần HTTPS hoặc localhost.");
      return;
    }
    await setCameraEnabled(!isCamOnRef.current);
  };

  const toggleMic = async () => {
    // Kiểm tra browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Trình duyệt không hỗ trợ microphone. Cần HTTPS hoặc localhost.");
      return;
    }
    await setMicEnabled(!isMicOnRef.current);
  };

  // Tạo silent stream để PeerJS có thể thiết lập kết nối mà không cần bật cam/mic thật
  const createSilentStream = (): MediaStream => {
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    return dest.stream;
  };

  // Khi localStream thay đổi (bật/tắt cam/mic): cập nhật VoiceContext và thông báo các peer tái kết nối
  useEffect(() => {
    if (isJoined) {
      // Nếu không có stream thật, dùng silent stream để PeerJS vẫn kết nối được
      const streamToUse = localStream || createSilentStream();
      setMyStream(streamToUse);
      myStreamRef.current = streamToUse;

      if (socket) {
        socket.emit("stream_updated", { classId });
      }

      if (peer) {
        remotePlayers.current.forEach((p) => {
          if (p.peerId) makeCall(p.peerId, streamToUse);
        });
      }
    }
  }, [localStream, isJoined, peer]);

  // useEffect để gán stream vào video element mỗi khi stream hoặc trạng thái cam thay đổi
  useEffect(() => {
    if (isCamOn && localStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = localStream;
    }
  }, [isCamOn, localStream]);

  // Screen sharing functions - Đưa ra ngoài useEffect
  const handleScreenShare = async () => {
    try {
      console.log("Attempting to share screen...");
      const activeShare = screenShareRef.current;
      const currentUserName = userNameRef.current;
      const currentUserRole = userRoleRef.current;

      // Kiểm tra browser support cơ bản
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Trình duyệt không hỗ trợ media. Cần HTTPS!");
        return;
      }

      // Kiểm tra nếu giáo viên đang share thì học sinh không được share
      if (
        activeShare.isSharing &&
        activeShare.sharerRole === "teacher" &&
        currentUserRole === "student"
      ) {
        alert("Giáo viên đang trình chiếu. Bạn không thể share màn hình!");
        return;
      }

      // Kiểm tra nếu ai đó khác đang share (trừ giáo viên)
      if (activeShare.isSharing && activeShare.sharerName !== currentUserName) {
        if (currentUserRole === "teacher") {
          // Giáo viên có thể gạt share của học sinh
          stopScreenShare();
        } else {
          alert(`${activeShare.sharerName} đang trình chiếu. Vui lòng chờ!`);
          return;
        }
      }

      if (activeShare.isSharing && activeShare.sharerName === currentUserName) {
        // Dừng share
        stopScreenShare();
      } else {
        // Kiểm tra hỗ trợ getDisplayMedia (không có trên mobile)
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const supportsDisplayMedia =
          !isMobile && !!navigator.mediaDevices?.getDisplayMedia;

        // Bắt đầu share
        const stream = supportsDisplayMedia
          ? await navigator.mediaDevices.getDisplayMedia({
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 },
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100,
              },
            })
          : await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });

        console.log("Screen share stream obtained:", stream);

        const nextShareState: ScreenShareState = {
          isSharing: true,
          sharerName: currentUserName,
          sharerRole: currentUserRole,
          stream: stream,
          sharerSocketId: socket?.id || "",
          isViewing: false,
        };

        screenShareRef.current = nextShareState;
        setScreenShare(nextShareState);

        // Thông báo cho server và các client khác
        if (socket) {
          socket.emit("start_screen_share", {
            classId,
            sharerName: currentUserName,
            sharerRole: currentUserRole,
          });

          // Tạo WebRTC connections cho tất cả người chơi khác
          setTimeout(() => {
            remotePlayers.current.forEach((_player, socketId) => {
              startScreenShareConnection(socketId);
            });
          }, 1000); // Delay để đảm bảo các client khác đã nhận được screen_share_started event
        }

        // Lắng nghe khi user dừng share từ browser
        stream.getVideoTracks()[0].onended = () => {
          console.log("Screen share ended by user");
          if (screenShareRef.current.stream === stream) {
            stopScreenShare();
          }
        };
      }
    } catch (error: any) {
      console.error("Lỗi khi share màn hình:", error);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (error?.name === "NotAllowedError") {
        alert(
          isMobile
            ? "Bạn đã từ chối quyền truy cập camera. Vui lòng cho phép và thử lại!"
            : "Bạn đã từ chối quyền chia sẻ màn hình. Vui lòng cho phép và thử lại!",
        );
      } else if (error?.name === "NotSupportedError") {
        alert("Trình duyệt không hỗ trợ tính năng này!");
      } else if (error?.name === "NotFoundError") {
        alert(
          isMobile
            ? "Không tìm thấy camera!"
            : "Không tìm thấy nguồn màn hình để chia sẻ!",
        );
      } else {
        alert(
          isMobile
            ? "Không thể chia sẻ camera. Vui lòng thử lại!"
            : "Không thể share màn hình. Vui lòng thử lại!",
        );
      }
    }
  };

  const stopScreenShare = () => {
    console.log("Stopping screen share...");
    const activeShare = screenShareRef.current;

    if (activeShare.stream) {
      activeShare.stream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
    }

    const nextShareState: ScreenShareState = {
      isSharing: false,
      sharerName: "",
      sharerRole: "student",
      stream: null,
      sharerSocketId: "",
      isViewing: false,
    };

    screenShareRef.current = nextShareState;
    setScreenShare(nextShareState);

    // Thông báo cho server khi dừng share
    if (socket) {
      socket.emit("stop_screen_share", {
        classId,
      });
    }

    // Đóng tất cả WebRTC connections
    screenShareConnections.current.forEach((pc) => {
      pc.close();
    });
    screenShareConnections.current.clear();
    setIsReceivingScreenShare(false);
  };

  // WebRTC Screen Sharing Functions
  const createScreenShareConnection = (
    targetSocketId: string,
    isOfferer: boolean,
  ) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("screen_share_ice_candidate", {
          classId,
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    if (!isOfferer) {
      // Viewer: nhận stream từ sharer
      pc.ontrack = (event) => {
        console.log("Received screen share stream:", event.streams[0]);
        const nextShareState: ScreenShareState = {
          ...screenShareRef.current,
          stream: event.streams[0],
        };
        screenShareRef.current = nextShareState;
        setScreenShare(nextShareState);
        setIsReceivingScreenShare(true);
      };
    }

    screenShareConnections.current.set(targetSocketId, pc);
    return pc;
  };

  const startScreenShareConnection = async (targetSocketId: string) => {
    if (!screenShareRef.current.stream) return;

    const pc = createScreenShareConnection(targetSocketId, true);

    // Thêm screen share stream vào connection
    screenShareRef.current.stream.getTracks().forEach((track) => {
      pc.addTrack(track, screenShareRef.current.stream!);
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit("screen_share_offer", {
          classId,
          targetSocketId,
          offer,
        });
      }
    } catch (error) {
      console.error("Error creating screen share offer:", error);
    }
  };

  const toggleSitting = () => {
    if (isSitting.current) {
      isSitting.current = false;
      player.current.y += 16;
      syncSeatActionUi();
      return;
    }

    if (canSit.current) {
      isSitting.current = true;
      stopMouseMovement();
      player.current.x = seatPos.current.x;
      player.current.y = seatPos.current.y;
      syncSeatActionUi();
    }
  };

  const handleImportStudents = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv,.txt";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        let studentsData: { name: string; mssv: string }[] = [];
        const fileName = file.name.toLowerCase();

        try {
          if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
            }) as any[][];

            jsonData.forEach((row) => {
              if (Array.isArray(row) && row.length >= 2) {
                let mssv = "";
                let name = "";

                row.forEach((cell) => {
                  const cellStr = String(cell).trim();
                  if (/^\d{5,15}$/.test(cellStr)) {
                    mssv = cellStr;
                  } else if (
                    cellStr.length > 2 &&
                    /[a-zA-ZÀ-ỹ]/.test(cellStr) &&
                    !cellStr.includes("@")
                  ) {
                    name = cellStr;
                  }
                });

                if (mssv) {
                  studentsData.push({
                    mssv,
                    name: name || `Sinh viên ${mssv}`,
                  });
                }
              }
            });
          } else {
            const text = new TextDecoder().decode(
              event.target?.result as ArrayBuffer,
            );
            const lines = text.split(/[\n\r]+/);
            lines.forEach((line) => {
              const parts = line.split(/[,|\t]+/).map((p) => p.trim());
              if (parts.length >= 2) {
                const mssv = parts.find((p) => /^\d{5,15}$/.test(p));
                const name = parts.find(
                  (p) => p.length > 2 && /[a-zA-ZÀ-ỹ]/.test(p) && p !== mssv,
                );
                if (mssv) {
                  studentsData.push({
                    mssv,
                    name: name || `Sinh viên ${mssv}`,
                  });
                }
              }
            });
          }

          if (studentsData.length === 0) {
            alert("Không tìm thấy dữ liệu sinh viên hợp lệ.");
            return;
          }

          const token = localStorage.getItem("token");
          const res = await fetch(
            getApiUrl(`/api/classes/${classId}/import-students`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ students: studentsData }),
            },
          );

          const data = await res.json();
          if (res.ok) {
            alert(data.message);
            fetchClassAttendance(); // Cập nhật lại danh sách sau khi upload
          } else {
            alert(data.message || "Có lỗi xảy ra khi import.");
          }
        } catch (error) {
          console.error("Import error:", error);
          alert("Lỗi khi xử lý file.");
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [showAttendancePanel, setShowAttendancePanel] = useState(false);

  const fetchClassAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/students/class/${classId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceList(data);
      } else {
        const errorText = await res.text();
        console.error("Attendance API error:", res.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  useEffect(() => {
    if (showAttendancePanel) {
      fetchClassAttendance();
      const interval = setInterval(fetchClassAttendance, 5000); // Tự động cập nhật mỗi 5s
      return () => clearInterval(interval);
    }
  }, [showAttendancePanel]);

  const currentAvatar =
    user?.role === "teacher"
      ? teacherCharacter
      : studentCharacters[selectedCharIndex] || studentCharacters[0];

  const player = useRef({
    x: 104,
    y: 600,
    speed: 3,
  });

  const keys = useRef<Set<string>>(new Set());
  const isSitting = useRef(false);
  const currentDir = useRef(0);
  const isMoving = useRef(false);
  const canSit = useRef(false);
  const seatPos = useRef({ x: 0, y: 0 });
  const frameX = useRef(0);
  const frameTimer = useRef(0);

  // Multiplayer: Lưu trữ danh sách người chơi khác
  const remotePlayers = useRef<Map<string, ClassroomPlayer>>(new Map());
  const remotePlayerImages = useRef<Map<string, HTMLImageElement>>(new Map());

  const upsertParticipant = (player: ClassroomPlayer) => {
    setParticipantRoster((prev) => {
      const next = prev.filter((item) => item.id !== player.id);
      next.push(player);
      return next.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    });
  };

  const removeParticipant = (playerId: string) => {
    setParticipantRoster((prev) => prev.filter((item) => item.id !== playerId));
  };

  const handleTeacherMediaControl = (
    targetSocketId: string,
    mediaType: MediaType,
    enabled: boolean,
  ) => {
    if (!socket || user?.role !== "teacher") return;

    socket.emit("teacher_media_control", {
      classId,
      targetSocketId,
      mediaType,
      enabled,
    });

    showMediaNotice(
      `${enabled ? "Đã gửi lệnh bật" : "Đã gửi lệnh tắt"} ${mediaType === "camera" ? "camera" : "microphone"} cho học sinh.`,
      "info",
    );
  };

  useEffect(() => {
    if (!isJoined) return;
    if (!isJoined || !socket) return; // Không chạy game loop nếu chưa join hoặc chưa có socket

    remotePlayers.current.clear();
    setParticipantRoster([]);

    // Join classroom via socket
    // #region agent log
    fetch("http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "687afc",
      },
      body: JSON.stringify({
        sessionId: "687afc",
        runId: "pre-debug",
        hypothesisId: "H5",
        location: "client/src/components/ClassCanvas.tsx:728",
        message: "emit join_classroom",
        data: {
          isJoined,
          hasSocket: !!socket,
          socketId: socket?.id || null,
          classId: classId,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    socket.emit("join_classroom", {
      classId: classId,
      user: {
        dbId: user?.id || (user as any)?._id, // Gửi ID thực từ Database
        mssv: studentId, // Gửi MSSV nhập từ ô input
        name: userName,
        avatar: currentAvatar,
        peerId: `peer-${socket.id}`,
        role: user?.role || "student",
        isCamOn: isCamOnRef.current,
        isMicOn: isMicOnRef.current,
      },
    });

    socket.on("current_players", (players: ClassroomPlayer[]) => {
      console.log("Received current_players:", players.length, "players");
      console.log(
        "Players data:",
        players.map((p) => ({
          id: p.id,
          name: p.name,
          socketId: p.id === socket.id ? "SELF" : "OTHER",
        })),
      );
      const selfPlayer = players.find((p) => p.id === socket.id);
      if (selfPlayer) {
        player.current.x = selfPlayer.x;
        player.current.y = selfPlayer.y;
        currentDir.current = selfPlayer.direction;
        frameX.current = selfPlayer.frame;
        isSitting.current = Boolean(selfPlayer.isSitting);
      }

      remotePlayers.current.clear();
      setParticipantRoster(players.filter((p) => p.id !== socket.id));

      players.forEach((p) => {
        if (p.id !== socket.id) {
          remotePlayers.current.set(p.id, p);
          if (!remotePlayerImages.current.has(p.avatar)) {
            const img = new Image();
            img.src = `/sprites/${p.avatar}.png`;
            remotePlayerImages.current.set(p.avatar, img);
          }

          // Thử gọi người chơi cũ sau một khoảng trễ ngắn để đảm bảo Peer đã ổn định
          setTimeout(() => {
            if (peer && myStream && p.peerId) {
              makeCall(p.peerId, myStream);
            }
          }, 1500);
        }
      });
    });

    socket.on("player_joined", (p: ClassroomPlayer) => {
      remotePlayers.current.set(p.id, p);
      upsertParticipant(p);
      if (!remotePlayerImages.current.has(p.avatar)) {
        const img = new Image();
        img.src = `/sprites/${p.avatar}.png`;
        remotePlayerImages.current.set(p.avatar, img);
      }

      // Tự động gọi người chơi mới gia nhập
      setTimeout(() => {
        if (peer && myStream && p.peerId) {
          makeCall(p.peerId, myStream);
        }
      }, 1000);
    });

    socket.on("player_moved", (p: ClassroomPlayer) => {
      if (remotePlayers.current.has(p.id)) {
        // Cập nhật mọi thông tin bao gồm cả isTalking
        const existing = remotePlayers.current.get(p.id);
        remotePlayers.current.set(p.id, {
          ...existing,
          ...p,
        } as ClassroomPlayer);
      }
    });

    socket.on("player_media_updated", (p: ClassroomPlayer) => {
      if (remotePlayers.current.has(p.id)) {
        const existing = remotePlayers.current.get(p.id);
        remotePlayers.current.set(p.id, {
          ...existing,
          ...p,
        } as ClassroomPlayer);
      }
      upsertParticipant(p);
    });

    socket.on(
      "teacher_media_command",
      async ({
        teacherSocketId,
        teacherName,
        mediaType,
        enabled,
      }: {
        teacherSocketId: string;
        teacherName: string;
        mediaType: MediaType;
        enabled: boolean;
      }) => {
        const result =
          mediaType === "camera"
            ? await setCameraEnabled(enabled, "teacher")
            : await setMicEnabled(enabled, "teacher");

        const mediaLabel = mediaType === "camera" ? "camera" : "microphone";

        if (result.success) {
          showMediaNotice(
            `${teacherName} đã ${enabled ? "bật" : "tắt"} ${mediaLabel} của bạn.`,
            "success",
          );
        }

        socket.emit("teacher_media_control_result", {
          classId: classId,
          teacherSocketId,
          targetSocketId: socket.id,
          mediaType,
          enabled,
          success: result.success,
          message: result.success
            ? `${teacherName} đã ${enabled ? "bật" : "tắt"} ${mediaLabel} thành công.`
            : result.message,
        });
      },
    );

    socket.on(
      "teacher_media_control_result",
      ({
        targetName,
        mediaType,
        enabled,
        success,
        message,
      }: {
        targetName: string;
        mediaType: MediaType;
        enabled: boolean;
        success: boolean;
        message?: string;
      }) => {
        const mediaLabel = mediaType === "camera" ? "camera" : "microphone";
        showMediaNotice(
          success
            ? `${enabled ? "Đã bật" : "Đã tắt"} ${mediaLabel} cho ${targetName}.`
            : message ||
                `Không thể ${enabled ? "bật" : "tắt"} ${mediaLabel} cho ${targetName}.`,
          success ? "success" : "error",
        );
      },
    );

    socket.on(
      "teacher_media_control_error",
      ({ message }: { message: string }) => {
        showMediaNotice(message, "error");
      },
    );

    // Screen sharing events
    socket.on(
      "screen_share_started",
      ({ sharerSocketId, sharerName, sharerRole }) => {
        console.log("Screen share started by:", sharerName);
        const nextShareState: ScreenShareState = {
          isSharing: true,
          sharerName,
          sharerRole,
          stream: null,
          sharerSocketId,
          isViewing: true,
        };
        screenShareRef.current = nextShareState;
        setScreenShare(nextShareState);
      },
    );

    // WebRTC Screen Share Events
    socket.on("screen_share_offer", async ({ sharerSocketId, offer }) => {
      console.log("Received screen share offer from:", sharerSocketId);
      const pc = createScreenShareConnection(sharerSocketId, false);

      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("screen_share_answer", {
          classId: classId,
          sharerSocketId,
          answer,
        });
      } catch (error) {
        console.error("Error handling screen share offer:", error);
      }
    });

    socket.on("screen_share_answer", async ({ viewerSocketId, answer }) => {
      console.log("Received screen share answer from:", viewerSocketId);
      const pc = screenShareConnections.current.get(viewerSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(answer);
        } catch (error) {
          console.error("Error handling screen share answer:", error);
        }
      }
    });

    socket.on(
      "screen_share_ice_candidate",
      async ({ fromSocketId, candidate }) => {
        console.log("Received screen share ICE candidate from:", fromSocketId);
        const pc = screenShareConnections.current.get(fromSocketId);
        if (pc) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (error) {
            console.error("Error adding screen share ICE candidate:", error);
          }
        }
      },
    );

    socket.on("screen_share_stopped", ({ sharerSocketId }) => {
      console.log("Screen share stopped by:", sharerSocketId);
      if (screenShareRef.current.sharerSocketId === sharerSocketId) {
        const nextShareState: ScreenShareState = {
          isSharing: false,
          sharerName: "",
          sharerRole: "student",
          stream: null,
          sharerSocketId: "",
          isViewing: false,
        };
        screenShareRef.current = nextShareState;
        setScreenShare(nextShareState);
      }
    });

    // Khi player mới join và mình đang share, gửi offer cho họ
    socket.on(
      "screen_share_request_offer",
      ({ viewerSocketId }: { viewerSocketId: string }) => {
        if (screenShareRef.current.isSharing && screenShareRef.current.stream) {
          startScreenShareConnection(viewerSocketId);
        }
      },
    );

    socket.on("kick_result", ({ targetName }: { targetName: string }) => {
      showMediaNotice(`Đã kick ${targetName} khỏi lớp.`, "success");
    });

    socket.on("request_call_back", ({ peerId }: { peerId: string }) => {
      const streamToUse = myStreamRef.current || createSilentStream();
      makeCall(peerId, streamToUse);
    });

    socket.on("peer_stream_updated", ({ peerId }: { peerId: string }) => {
      if (myStreamRef.current) {
        makeCall(peerId, myStreamRef.current);
      }
    });

    socket.on("player_left", (id: string) => {
      remotePlayers.current.delete(id);
      removeParticipant(id);
    });

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    canvas.tabIndex = 1;
    canvas.style.outline = "none";

    const tileSize = 32;

    interface MapLayer {
      data: number[];
      name: string;
    }
    interface MapData {
      width: number;
      height: number;
      layers: MapLayer[];
    }

    let mapData: MapData | null = null;
    let seatPositions: SeatPosition[] = [];

    const tilesets = [
      { firstgid: 1, img: new Image(), src: "/tiles/FloorAndGround.png" },
      {
        firstgid: 2561,
        img: new Image(),
        src: "/tiles/Classroom_and_library.png",
      },
      { firstgid: 3105, img: new Image(), src: "/tiles/Generic.png" },
      {
        firstgid: 4353,
        img: new Image(),
        src: "/tiles/Modern_Office_Black_Shadow.png",
      },
      { firstgid: 5201, img: new Image(), src: "/tiles/whiteboard.png" },
      { firstgid: 5213, img: new Image(), src: "/tiles/Basement.png" },
    ];
    tilesets.forEach((t) => {
      t.img.src = t.src;
    });

    fetch("/maps/classroom1.tmj")
      .then((r) => r.json())
      .then((data: MapData) => {
        mapData = data;

        const classLayer = data.layers.find((layer) => layer.name === "Class");
        if (!classLayer) return;

        seatPositions = classLayer.data.reduce<SeatPosition[]>(
          (acc, tile, index) => {
            if (!CHAIR_SEAT_TILES.includes(tile)) return acc;

            const tileX = (index % data.width) * tileSize;
            const tileY = Math.floor(index / data.width) * tileSize;
            const seatX = tileX;
            const seatY = tileY - SEAT_Y_OFFSET;
            const seatDirection = LEFT_FACING_CHAIR_TILES.includes(tile)
              ? 2
              : 3;

            acc.push({
              x: seatX,
              y: seatY,
              centerX: seatX + 16,
              centerY: seatY + 24,
              direction: seatDirection,
            });

            return acc;
          },
          [],
        );
      });

    const getNearestSeat = () => {
      const playerCenterX = player.current.x + 16;
      const playerCenterY = player.current.y + 24;
      let nearestSeat: SeatPosition | null = null;
      let minDistance = SIT_RANGE;

      for (const seat of seatPositions) {
        const distance = Math.hypot(
          playerCenterX - seat.centerX,
          playerCenterY - seat.centerY,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestSeat = seat;
        }
      }

      return nearestSeat;
    };

    const playerImg = new Image();
    playerImg.src = `/sprites/${currentAvatar}.png`;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bắt cả key và code để tăng độ chính xác
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      keys.current.add(key);
      keys.current.add(code);

      // Chỉ chặn scroll trang nếu đang tập trung vào Canvas
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(
          key,
        ) ||
        ["arrowup", "arrowdown", "arrowleft", "arrowright", "space"].includes(
          code,
        )
      ) {
        e.preventDefault();
      }

      if (
        !isSitting.current &&
        ([
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "a",
          "s",
          "d",
        ].includes(key) ||
          ["keyw", "keya", "keys", "keyd"].includes(code))
      ) {
        stopMouseMovement();
      }

      if ((key === "h" || code === "keyh") && !e.repeat) {
        toggleSitting();
      }

      // Phím S để share màn hình khi đang ngồi
      if ((key === "s" || code === "keys") && !e.repeat && isSitting.current) {
        e.preventDefault();
        handleScreenShare();
      }

      // Push to Talk: Giữ G để nói
      if (key === "g" || code === "keyg") {
        if (!isTalkingRef.current) {
          console.log("PTT ON");
          setIsPushingToTalk(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      keys.current.delete(key);
      keys.current.delete(code);

      if (key === "g" || code === "keyg") {
        console.log("PTT OFF");
        setIsPushingToTalk(false);
      }
    };

    const handleBlur = () => {
      keys.current.clear();
    };

    // TÁCH BIỆT HOÀN TOÀN: Đưa sự kiện về Canvas thay vì Window
    canvas.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("blur", handleBlur);

    // Tự động focus vào canvas khi người dùng click vào vùng game
    const handleCanvasClick = (e: MouseEvent) => {
      canvas.focus();

      // Tính toán vị trí click chính xác trên canvas (xử lý object-fit: contain)
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const canvasAspect = canvas.width / canvas.height;
      const screenAspect = rect.width / rect.height;

      let clickX, clickY, scale;

      if (screenAspect > canvasAspect) {
        // Màn hình rộng hơn canvas (có thanh đen 2 bên)
        scale = rect.height / canvas.height;
        const offsetX = (rect.width - canvas.width * scale) / 2;
        clickX = (x - offsetX) / scale;
        clickY = y / scale;
      } else {
        // Màn hình cao hơn canvas (có thanh đen trên dưới)
        scale = rect.width / canvas.width;
        const offsetY = (rect.height - canvas.height * scale) / 2;
        clickX = x / scale;
        clickY = (y - offsetY) / scale;
      }

      console.log("Click on map (corrected):", { clickX, clickY });

      // Chỉ di chuyển nếu không đang ngồi
      if (!isSitting.current) {
        // Căn chỉnh để CHÂN nhân vật (điểm tiếp xúc đất) trùng đúng điểm click
        // Nhân vật rộng 32 (offset tâm là 16), cao 48 (offset chân là ~44)
        const nextTarget = {
          x: clickX - 16,
          y: clickY - 44,
        };

        // Giới hạn target trong vùng bản đồ hợp lệ
        nextTarget.x = Math.max(-16, Math.min(nextTarget.x, 1280 - 16));
        nextTarget.y = Math.max(80 - 44, Math.min(nextTarget.y, 960 - 44));

        targetPositionRef.current = nextTarget;
        isMovingToTargetRef.current = true;
        setTargetPosition(nextTarget);
        setIsMovingToTarget(true);
      }
    };
    canvas.addEventListener("click", handleCanvasClick);

    // Screen sharing functions - Đã di chuyển ra ngoài useEffect

    function update() {
      canSit.current = false;
      if (!isSitting.current) {
        const nearestSeat = getNearestSeat();
        if (nearestSeat) {
          canSit.current = true;
          currentDir.current = nearestSeat.direction;
          seatPos.current = { x: nearestSeat.x, y: nearestSeat.y };
        }
      }

      if (isSitting.current) {
        isMoving.current = false;
        stopMouseMovement();
        syncSeatActionUi();
        return;
      }

      isMoving.current = false;
      let moveX = 0;
      let moveY = 0;
      const keyboardMoveY =
        (keys.current.has("arrowup") ||
        keys.current.has("w") ||
        keys.current.has("keyw")
          ? -1
          : 0) +
        (keys.current.has("arrowdown") ||
        keys.current.has("s") ||
        keys.current.has("keys")
          ? 1
          : 0);
      const keyboardMoveX =
        (keys.current.has("arrowleft") ||
        keys.current.has("a") ||
        keys.current.has("keya")
          ? -1
          : 0) +
        (keys.current.has("arrowright") ||
        keys.current.has("d") ||
        keys.current.has("keyd")
          ? 1
          : 0);

      if (keyboardMoveX !== 0 || keyboardMoveY !== 0) {
        stopMouseMovement();
        moveX = keyboardMoveX;
        moveY = keyboardMoveY;
      } else if (isMovingToTargetRef.current && targetPositionRef.current) {
        const currentTarget = targetPositionRef.current;
        const dx = currentTarget.x - player.current.x;
        const dy = currentTarget.y - player.current.y;
        const distance = Math.hypot(dx, dy);
        const spd = player.current.speed;

        if (distance <= spd + 1) {
          // Thêm 1px buffer để snap mượt hơn
          player.current.x = currentTarget.x;
          player.current.y = currentTarget.y;
          stopMouseMovement();
        } else {
          // DI CHUYỂN TRỰC TIẾP TỚI MỤC TIÊU: Chuẩn hóa vector
          moveX = dx / distance;
          moveY = dy / distance;
        }
      }

      if (moveX !== 0 || moveY !== 0) {
        const spd = player.current.speed;
        const isKeyboard = !isMovingToTargetRef.current;
        const norm = isKeyboard ? Math.hypot(moveX, moveY) : 1;

        const stepX = (moveX / norm) * spd;
        const stepY = (moveY / norm) * spd;

        const nextX = player.current.x + stepX;
        const nextY = player.current.y + stepY;

        let movedAny = false;

        // Kiểm tra và di chuyển theo trục X
        if (moveX !== 0) {
          let canMoveX = true;
          if (nextX < -16 || nextX > 1280 - 16) canMoveX = false;

          if (canMoveX && mapData) {
            const tx = Math.floor((nextX + 16) / tileSize);
            const ty = Math.floor((player.current.y + 44) / tileSize);
            const index = ty * mapData.width + tx;

            if (index >= 0 && index < mapData.width * mapData.height) {
              for (const layer of mapData.layers) {
                const name = (layer as any).name;
                if (name === "Class" || name === "cảnh vật") {
                  const tile = layer.data[index];
                  // Kiểm tra các tile cản trở (bàn, kệ sách, bảng)
                  if (
                    (tile >= 4423 && tile <= 4457) ||
                    (tile >= 2977 && tile <= 2995) ||
                    (tile >= 5213 && tile <= 5247)
                  ) {
                    canMoveX = false;
                    break;
                  }
                }
              }
            }
          }

          if (canMoveX) {
            player.current.x = nextX;
            movedAny = true;
          }
        }

        // Kiểm tra và di chuyển theo trục Y
        if (moveY !== 0) {
          let canMoveY = true;
          if (nextY < 80 - 44 || nextY > 960 - 44) canMoveY = false;

          if (canMoveY && mapData) {
            const tx = Math.floor((player.current.x + 16) / tileSize);
            const ty = Math.floor((nextY + 44) / tileSize);
            const index = ty * mapData.width + tx;

            if (index >= 0 && index < mapData.width * mapData.height) {
              for (const layer of mapData.layers) {
                const name = (layer as any).name;
                if (name === "Class" || name === "cảnh vật") {
                  const tile = layer.data[index];
                  if (
                    (tile >= 4423 && tile <= 4457) ||
                    (tile >= 2977 && tile <= 2995) ||
                    (tile >= 5213 && tile <= 5247)
                  ) {
                    canMoveY = false;
                    break;
                  }
                }
              }
            }
          }

          if (canMoveY) {
            player.current.y = nextY;
            movedAny = true;
          }
        }

        if (movedAny) {
          isMoving.current = true;
          // Cập nhật hướng dựa trên vector di chuyển
          if (Math.abs(moveY) > Math.abs(moveX)) {
            currentDir.current = moveY > 0 ? 0 : 1; // 0: Down, 1: Up
          } else {
            currentDir.current = moveX > 0 ? 3 : 2; // 3: Right, 2: Left
          }
        } else if (isMovingToTargetRef.current) {
          // Nếu không thể di chuyển theo cả 2 hướng tới target, dừng lại
          stopMouseMovement();
        }
      }

      if (isMoving.current) {
        frameTimer.current++;
        if (frameTimer.current > 8) {
          frameX.current = (frameX.current + 1) % 6;
          frameTimer.current = 0;
        }
      } else {
        frameX.current = 0;
      }

      syncSeatActionUi();
    }

    function getTileset(tile: number) {
      let selected = tilesets[0];
      for (const ts of tilesets) {
        if (tile >= ts.firstgid) selected = ts;
      }
      return selected;
    }

    function drawMap() {
      if (!mapData) return;
      console.log("Drawing map, remote players:", remotePlayers.current.size);

      for (const layer of mapData.layers) {
        const name = (layer as any).name;
        if (name === "Floor") {
          drawLayer(layer);
        }
      }

      for (const layer of mapData.layers) {
        const name = (layer as any).name;
        if (name === "Class" || name === "Objects") {
          drawLayer(layer);
        }
      }

      const playerFeetY = player.current.y + 44;

      for (const layer of mapData.layers) {
        const name = (layer as any).name;
        if (name === "cảnh vật" || name === "cảnh vật") {
          drawLayerCustom(layer, (tileY) => tileY + 24 <= playerFeetY);
        }
      }

      drawPlayer();

      // Vẽ các người chơi khác
      remotePlayers.current.forEach((p) => {
        drawRemotePlayer(p);
      });

      drawOccupiedSeats();

      for (const layer of mapData.layers) {
        const name = (layer as any).name;
        if (name === "cảnh vật" || name === "cảnh vật") {
          drawLayerCustom(layer, (tileY) => tileY + 24 > playerFeetY);
        }
      }
    }

    function drawLayerCustom(
      layer: MapLayer,
      condition: (tileY: number) => boolean,
    ) {
      if (!mapData) return;
      for (let i = 0; i < layer.data.length; i++) {
        const tile = layer.data[i];
        if (tile === 0) continue;
        const mapWidth = mapData.width;
        const x = (i % mapWidth) * tileSize;
        const y = Math.floor(i / mapWidth) * tileSize;

        if (!condition(y)) continue;

        const tileset = getTileset(tile);
        if (!tileset.img.complete) continue;
        const tileIndex = tile - tileset.firstgid;
        const tilesPerRow = Math.floor(tileset.img.width / tileSize);
        const sx = (tileIndex % tilesPerRow) * tileSize;
        const sy = Math.floor(tileIndex / tilesPerRow) * tileSize;
        ctx.drawImage(
          tileset.img,
          sx,
          sy,
          tileSize,
          tileSize,
          x,
          y,
          tileSize,
          tileSize,
        );
      }
    }

    function drawLayer(layer: MapLayer) {
      drawLayerCustom(layer, () => true);
    }

    function drawSeatGlow(x: number, y: number, isLocalSeat = false) {
      ctx.save();
      const outerFill = isLocalSeat
        ? "rgba(74, 222, 128, 0.32)"
        : "rgba(250, 204, 21, 0.32)";
      const innerFill = isLocalSeat
        ? "rgba(187, 247, 208, 0.78)"
        : "rgba(254, 240, 138, 0.78)";
      const borderColor = isLocalSeat
        ? "rgba(187, 247, 208, 0.98)"
        : "rgba(254, 240, 138, 0.98)";
      const shadowColor = isLocalSeat
        ? "rgba(74, 222, 128, 0.95)"
        : "rgba(250, 204, 21, 0.95)";

      ctx.fillStyle = outerFill;
      ctx.strokeStyle = borderColor;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 10, 22, 17, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = innerFill;
      ctx.beginPath();
      ctx.roundRect(x + 9, y + 14, 14, 9, 4);
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 9);
      ctx.lineTo(x + 22, y + 9);
      ctx.moveTo(x + 10, y + 28);
      ctx.lineTo(x + 22, y + 28);
      ctx.stroke();

      ctx.restore();
    }

    function drawOccupiedSeats() {
      if (isSitting.current) {
        drawSeatGlow(player.current.x, player.current.y, true);
      }

      remotePlayers.current.forEach((p) => {
        if (p.isSitting) {
          drawSeatGlow(p.x, p.y);
        }
      });
    }

    function drawPlayer() {
      if (!playerImg.complete) return;
      const frameWidth = 32;
      const frameHeight = 48;

      let actualFrameX = 0;

      if (isSitting.current) {
        // Tư thế ngồi dựa trên hướng
        const sitMap = [48, 51, 49, 50]; // [xuống, lên, trái, phải]
        actualFrameX = sitMap[currentDir.current];
      } else if (isMoving.current) {
        const runStarts = [24, 42, 30, 36];
        actualFrameX = runStarts[currentDir.current] + frameX.current;
      } else {
        const idleStarts = [0, 18, 6, 12];
        actualFrameX = idleStarts[currentDir.current] + frameX.current;
      }

      if (actualFrameX >= 52) actualFrameX = 0;

      ctx.drawImage(
        playerImg,
        actualFrameX * frameWidth,
        0,
        frameWidth,
        frameHeight,
        player.current.x,
        player.current.y,
        frameWidth,
        frameHeight,
      );

      if (userName) {
        ctx.font = "bold 12px Arial";
        const textWidth = ctx.measureText(userName).width;

        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.roundRect(
          player.current.x + frameWidth / 2 - textWidth / 2 - 5,
          player.current.y - 20,
          textWidth + 10,
          16,
          4,
        );
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(
          userName,
          player.current.x + frameWidth / 2,
          player.current.y - 8,
        );
        ctx.textAlign = "start";
      }

      // Vẽ tên trên đầu nhân vật - SỬ DỤNG isTalkingRef để đảm bảo UI đồng bộ
      drawNameTag(
        userName,
        player.current.x,
        player.current.y,
        frameWidth,
        isTalkingRef.current,
      );
    }

    function drawRemotePlayer(p: ClassroomPlayer) {
      const img = remotePlayerImages.current.get(p.avatar);
      if (!img || !img.complete) return;

      const frameWidth = 32;
      const frameHeight = 48;
      let actualFrameX = 0;

      // Hướng quay giống local player
      if (p.isSitting) {
        const sitMap = [48, 51, 49, 50];
        actualFrameX = sitMap[p.direction];
      } else if (p.isMoving) {
        const runStarts = [24, 42, 30, 36];
        actualFrameX = runStarts[p.direction] + p.frame;
      } else {
        const idleStarts = [0, 18, 6, 12];
        actualFrameX = idleStarts[p.direction] + p.frame;
      }

      if (actualFrameX >= 52) actualFrameX = 0;

      ctx.drawImage(
        img,
        actualFrameX * frameWidth,
        0,
        frameWidth,
        frameHeight,
        p.x,
        p.y,
        frameWidth,
        frameHeight,
      );

      drawNameTag(p.name, p.x, p.y, frameWidth, p.isTalking);
    }

    function drawNameTag(
      name: string,
      x: number,
      y: number,
      frameWidth: number,
      isTalking?: boolean,
    ) {
      if (!name) return;
      ctx.font = "bold 12px Arial";
      const textWidth = ctx.measureText(name).width;

      ctx.beginPath();
      ctx.fillStyle = isTalking
        ? "rgba(74, 222, 128, 0.8)"
        : "rgba(0, 0, 0, 0.5)";
      ctx.roundRect(
        x + frameWidth / 2 - textWidth / 2 - 5,
        y - 20,
        textWidth + 10,
        16,
        4,
      );
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText((isTalking ? "🎤 " : "") + name, x + frameWidth / 2, y - 8);
      ctx.textAlign = "start";
    }

    function drawUI() {
      const activeShare = screenShareRef.current;

      if (canSit.current && !isSitting.current) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(player.current.x - 35, player.current.y - 40, 110, 24);
        ctx.fillStyle = "white";
        ctx.font = "bold 11px Arial";
        ctx.fillText(
          "Nhấn H để ngồi",
          player.current.x - 15,
          player.current.y - 24,
        );
      }

      // Hiển thị UI share màn hình khi đang ngồi
      if (isSitting.current) {
        const canShare =
          !activeShare.isSharing ||
          activeShare.sharerName === userNameRef.current ||
          (userRoleRef.current === "teacher" &&
            activeShare.sharerRole === "student");

        if (canShare) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(player.current.x - 45, player.current.y - 40, 130, 24);
          ctx.fillStyle = "white";
          ctx.font = "bold 11px Arial";
          const text =
            activeShare.sharerName === userNameRef.current
              ? "Nhấn S để dừng share"
              : "Nhấn S để share màn hình";
          ctx.fillText(text, player.current.x - 35, player.current.y - 24);
        }
      }

      // Hiển thị thông tin người đang share
      if (activeShare.isSharing) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(10, 10, 300, 60);
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 16px Arial";
        ctx.fillText(`📺 ${activeShare.sharerName} đang trình chiếu`, 20, 35);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(
          `Vai trò: ${activeShare.sharerRole === "teacher" ? "Giáo viên" : "Học sinh"}`,
          20,
          55,
        );
      }

      // Hiển thị target position khi di chuyển bằng chuột
      const targetMarker = targetPositionRef.current;
      if (isMovingToTargetRef.current && targetMarker) {
        ctx.fillStyle = "rgba(74, 222, 128, 0.5)";
        ctx.beginPath();
        ctx.arc(targetMarker.x + 16, targetMarker.y + 44, 10, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(targetMarker.x + 16, targetMarker.y + 44, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    let animationId: number;
    let lastEmitTime = 0;

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      update();

      // Gửi vị trí cho server (throttle 30ms)
      const now = Date.now();
      if (now - lastEmitTime > 30 && socket) {
        socket.emit("move", {
          classId: classId,
          x: player.current.x,
          y: player.current.y,
          frame: frameX.current,
          direction: currentDir.current,
          isMoving: isMoving.current,
          isSitting: isSitting.current,
          isTalking: isTalkingRef.current,
        });
        lastEmitTime = now;
      }

      drawMap();
      drawUI();
      animationId = requestAnimationFrame(loop);
    }

    if (playerImg.complete) {
      loop();
    } else {
      playerImg.onload = () => {
        loop();
      };
    }

    setTimeout(() => {
      if (!animationId) {
        loop();
      }
    }, 1000);

    return () => {
      canvas.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("blur", handleBlur);
      canvas.removeEventListener("click", handleCanvasClick);
      cancelAnimationFrame(animationId);
      socket.off("current_players");
      socket.off("player_joined");
      socket.off("player_moved");
      socket.off("player_media_updated");
      socket.off("teacher_media_command");
      socket.off("teacher_media_control_result");
      socket.off("teacher_media_control_error");
      socket.off("screen_share_started");
      socket.off("screen_share_stopped");
      socket.off("screen_share_offer");
      socket.off("screen_share_answer");
      socket.off("screen_share_ice_candidate");
      socket.off("player_left");
    };
  }, [
    isJoined,
    userName,
    selectedCharIndex,
    socket,
    studentId,
    user?.role,
    classId,
  ]);

  const teacherControlsRight = isChatVisible ? "370px" : "80px";
  const teacherControlsButtonRight = isChatVisible ? "370px" : "80px";
  const mediaNoticeRight =
    user?.role === "teacher"
      ? isTeacherControlsVisible
        ? isChatVisible
          ? "660px"
          : "360px"
        : teacherControlsButtonRight
      : isChatVisible
        ? "370px"
        : "20px";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1b26",
      }}
    >
      {!isJoined && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          <div
            style={{
              backgroundColor: "#20212b",
              padding: "40px",
              borderRadius: "20px",
              width: "650px",
              color: "white",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h2
              style={{
                marginBottom: "40px",
                fontSize: "24px",
                fontWeight: "500",
                color: "#e2e8f0",
              }}
            >
              Welcome To TDS Classroom
            </h2>

            <div style={{ display: "flex", gap: "40px", marginBottom: "40px" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#e5e7eb",
                    borderRadius: "12px",
                    width: "100%",
                    height: "220px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "48px",
                      backgroundImage: `url(/sprites/${currentAvatar}.png)`,
                      backgroundPosition: "0px 0px",
                      backgroundRepeat: "no-repeat",
                      transform: "scale(3.5)",
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
                {user?.role === "student" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "30px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setSelectedCharIndex(
                          (prev) =>
                            (prev - 1 + studentCharacters.length) %
                            studentCharacters.length,
                        )
                      }
                      style={{
                        background: "none",
                        border: "1px solid #4b4c56",
                        color: "white",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        fontSize: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setSelectedCharIndex(
                          (prev) => (prev + 1) % studentCharacters.length,
                        )
                      }
                      style={{
                        background: "none",
                        border: "1px solid #4b4c56",
                        color: "white",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        fontSize: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  flex: 1.2,
                  display: "flex",
                  flexDirection: "column",
                  gap: "25px",
                }}
              >
                <div style={{ position: "relative", textAlign: "left" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "12px",
                      backgroundColor: "#20212b",
                      padding: "0 5px",
                      fontSize: "12px",
                      color: "#4ade80",
                      zIndex: 1,
                    }}
                  >
                    Vai trò
                  </div>
                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "#2a2b35",
                      border: "1px solid #4ade80",
                      borderRadius: "8px",
                      padding: "14px 15px",
                      color: "white",
                      fontSize: "15px",
                      textAlign: "center",
                    }}
                  >
                    {user?.role === "teacher" ? "Giáo viên" : "Học sinh"}
                  </div>
                </div>

                <div style={{ position: "relative", textAlign: "left" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "12px",
                      backgroundColor: "#20212b",
                      padding: "0 5px",
                      fontSize: "12px",
                      color: "#4ade80",
                      zIndex: 1,
                    }}
                  >
                    Name
                  </div>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name..."
                    style={{
                      width: "100%",
                      backgroundColor: "transparent",
                      border: "1px solid #4ade80",
                      borderRadius: "8px",
                      padding: "14px 15px",
                      color: "white",
                      outline: "none",
                      fontSize: "15px",
                    }}
                  />
                </div>

                {user?.role === "student" && (
                  <div style={{ position: "relative", textAlign: "left" }}>
                    <div
                      style={{
                        position: "absolute",
                        top: "-10px",
                        left: "12px",
                        backgroundColor: "#20212b",
                        padding: "0 5px",
                        fontSize: "12px",
                        color: "#4ade80",
                        zIndex: 1,
                      }}
                    >
                      MSSV
                    </div>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Enter your student ID..."
                      style={{
                        width: "100%",
                        backgroundColor: "transparent",
                        border: "1px solid #4ade80",
                        borderRadius: "8px",
                        padding: "14px 15px",
                        color: "white",
                        outline: "none",
                        fontSize: "15px",
                      }}
                    />
                  </div>
                )}

                {/* Video Preview Box */}
                <div
                  style={{
                    backgroundColor: "#000",
                    borderRadius: "12px",
                    height: "160px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #333",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isCamOn ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{ color: "#555", fontSize: "13px" }}>
                      Camera is off
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      bottom: "15px",
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      gap: "25px",
                      zIndex: 2,
                    }}
                  >
                    <span
                      onClick={toggleCamera}
                      style={{
                        cursor: "pointer",
                        fontSize: "20px",
                        opacity: isCamOn ? 1 : 0.6,
                        filter: isCamOn ? "none" : "grayscale(100%)",
                      }}
                    >
                      📹
                    </span>
                    <span
                      onClick={toggleMic}
                      style={{
                        cursor: "pointer",
                        fontSize: "20px",
                        opacity: isMicOn ? 1 : 0.6,
                        filter: isMicOn ? "none" : "grayscale(100%)",
                      }}
                    >
                      🎤
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                const isTeacher = user?.role === "teacher";
                const hasName = userName.trim();
                const hasId = studentId.trim();

                if (hasName && (isTeacher || hasId)) {
                  // Tự động bật Mic khi Join nếu chưa bật
                  if (!isMicOnRef.current) {
                    const result = await setMicEnabled(true);
                    if (!result.success) {
                      console.error(
                        "Auto mic activation failed:",
                        result.message,
                      );
                    }
                  } else {
                    setMyStream(localStreamRef.current);
                  }
                  setIsJoined(true);
                } else {
                  alert("Vui lòng nhập đầy đủ Tên và MSSV!");
                }
              }}
              style={{
                backgroundColor: "#4ade80",
                color: "#1a1b26",
                border: "none",
                borderRadius: "8px",
                padding: "12px 60px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.filter = "brightness(1.1)")
              }
              onMouseOut={(e) => (e.currentTarget.style.filter = "none")}
            >
              Join
            </button>
          </div>
        </div>
      )}

      {mediaNotice && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: mediaNoticeRight,
            backgroundColor:
              mediaNotice.tone === "error"
                ? "rgba(239, 68, 68, 0.95)"
                : mediaNotice.tone === "success"
                  ? "rgba(34, 197, 94, 0.95)"
                  : "rgba(15, 23, 42, 0.92)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "12px",
            zIndex: 2100,
            maxWidth: "320px",
            fontSize: "13px",
            lineHeight: 1.4,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          }}
        >
          {mediaNotice.text}
        </div>
      )}

      {isJoined && (seatActionUi.canSit || seatActionUi.isSitting) && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "24px",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "12px",
            zIndex: 1250,
            alignItems: "center",
          }}
        >
          <button
            onClick={toggleSitting}
            style={{
              border: "none",
              borderRadius: "999px",
              backgroundColor: seatActionUi.isSitting ? "#f59e0b" : "#4ade80",
              color: seatActionUi.isSitting ? "#111827" : "#052e16",
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            }}
            title={seatActionUi.isSitting ? "Đứng dậy" : "Ngồi xuống"}
          >
            {seatActionUi.isSitting ? "Đứng dậy (H)" : "Ngồi xuống (H)"}
          </button>

          {seatActionUi.isSitting && (
            <button
              onClick={() => {
                void handleScreenShare();
              }}
              disabled={!seatActionUi.canShare}
              style={{
                border: "none",
                borderRadius: "999px",
                backgroundColor: seatActionUi.canShare
                  ? "#0f172a"
                  : "rgba(15, 23, 42, 0.55)",
                color: "white",
                padding: "12px 18px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: seatActionUi.canShare ? "pointer" : "not-allowed",
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: seatActionUi.canShare
                  ? "rgba(74, 222, 128, 0.35)"
                  : "rgba(148, 163, 184, 0.25)",
              }}
              title={
                seatActionUi.canShare
                  ? "Chia sẻ màn hình"
                  : "Hiện đang có người khác chia sẻ"
              }
            >
              {seatActionUi.shareLabel} (S)
            </button>
          )}
        </div>
      )}

      {/* Screen Share Display */}
      {screenShare.isSharing && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            height: "80%",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 2000,
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
              color: "white",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px" }}>
              📺 {screenShare.sharerName} đang chia sẻ màn hình
            </h3>
            <button
              onClick={() => {
                if (screenShare.isViewing) {
                  // Nếu đang xem, chỉ đóng view
                  const nextShareState: ScreenShareState = {
                    ...screenShare,
                    stream: null,
                  };
                  setScreenShare(nextShareState);
                } else {
                  // Nếu đang share, dừng share
                  stopScreenShare();
                }
              }}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {screenShare.isViewing ? "Đóng" : "Dừng chia sẻ"}
            </button>
          </div>

          {screenShare.stream ? (
            <video
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "8px",
              }}
              ref={(video) => {
                if (video && screenShare.stream) {
                  video.srcObject = screenShare.stream;
                }
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px",
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
              }}
            >
              Đang chờ kết nối màn hình chia sẻ...
            </div>
          )}
        </div>
      )}

      {isJoined && user?.role === "teacher" && (
        <>
          {!isTeacherControlsVisible && (
            <button
              onClick={() => setIsTeacherControlsVisible(true)}
              style={{
                position: "fixed",
                top: "20px",
                right: teacherControlsButtonRight,
                zIndex: 1200,
                border: "none",
                borderRadius: "999px",
                backgroundColor: "rgba(15, 23, 42, 0.94)",
                color: "white",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "rgba(74, 222, 128, 0.35)",
              }}
              title="Mở bảng điều khiển học sinh"
            >
              Mở điều khiển
            </button>
          )}

          {isTeacherControlsVisible && (
            <div
              style={{
                position: "fixed",
                top: "20px",
                right: teacherControlsRight,
                width: "260px",
                maxHeight: "70vh",
                overflowY: "auto",
                backgroundColor: "rgba(15, 23, 42, 0.94)",
                border: "1px solid rgba(74, 222, 128, 0.35)",
                borderRadius: "16px",
                padding: "16px",
                zIndex: 1200,
                color: "white",
                boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    Điều khiển học sinh
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#cbd5e1",
                    }}
                  >
                    Chỉ tài khoản giáo viên mới có thể bật hoặc tắt cam, mic của
                    học sinh.
                  </div>
                </div>

                <button
                  onClick={() => setIsTeacherControlsVisible(false)}
                  style={{
                    border: "none",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "white",
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                  title="Ẩn bảng điều khiển"
                >
                  -
                </button>
              </div>

              {participantRoster.filter((player) => player.role === "student")
                .length === 0 ? (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    padding: "12px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  Chưa có học sinh nào trong lớp.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {participantRoster
                    .filter((player) => player.role === "student")
                    .map((player) => (
                      <div
                        key={player.id}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderRadius: "14px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700 }}>
                            {player.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#cbd5e1",
                              marginTop: "4px",
                            }}
                          >
                            Cam: {player.isCamOn ? "Đang bật" : "Đang tắt"} |
                            Mic: {player.isMicOn ? "Đang bật" : "Đang tắt"}
                          </div>
                        </div>

                        {/* Camera preview của học sinh */}
                        {player.isCamOn &&
                          (() => {
                            const studentStream = remoteStreams.get(
                              `peer-${player.id}`,
                            );
                            const hasVideo = studentStream
                              ?.getVideoTracks()
                              .some(
                                (t: MediaStreamTrack) =>
                                  t.enabled && t.readyState === "live",
                              );
                            return hasVideo ? (
                              <div
                                style={{
                                  width: "100%",
                                  height: "120px",
                                  backgroundColor: "#000",
                                  borderRadius: "8px",
                                  overflow: "hidden",
                                  border: "1px solid rgba(74,222,128,0.4)",
                                }}
                              >
                                <video
                                  autoPlay
                                  playsInline
                                  muted
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  ref={(el) => {
                                    if (el && studentStream)
                                      el.srcObject = studentStream;
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "80px",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  color: "#94a3b8",
                                }}
                              >
                                Đang kết nối camera...
                              </div>
                            );
                          })()}

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() =>
                              handleTeacherMediaControl(
                                player.id,
                                "camera",
                                !player.isCamOn,
                              )
                            }
                            style={{
                              flex: 1,
                              border: "none",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "white",
                              backgroundColor: player.isCamOn
                                ? "#ef4444"
                                : "#16a34a",
                            }}
                          >
                            {player.isCamOn ? "Tắt cam" : "Bật cam"}
                          </button>

                          <button
                            onClick={() =>
                              handleTeacherMediaControl(
                                player.id,
                                "microphone",
                                !player.isMicOn,
                              )
                            }
                            style={{
                              flex: 1,
                              border: "none",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "white",
                              backgroundColor: player.isMicOn
                                ? "#ef4444"
                                : "#16a34a",
                            }}
                          >
                            {player.isMicOn ? "Tắt mic" : "Bật mic"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Media Controls - Hiển thị khi đã join */}
      {isJoined && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            zIndex: 1000,
          }}
        >
          {/* Nút chức năng cho Giáo viên */}
          {user?.role === "teacher" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                padding: "12px",
                borderRadius: "16px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(74, 222, 128, 0.25)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
              }}
            >
              <button
                onClick={handleImportStudents}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                  width: "100%",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1d4ed8")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2563eb")
                }
              >
                <span style={{ fontSize: "16px" }}>📤</span> Upload danh sách
              </button>
              <button
                onClick={() => setShowAttendancePanel(p => !p)}
                style={{
                  backgroundColor: showAttendancePanel ? "#ef4444" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: "16px" }}>
                  {showAttendancePanel ? "✖" : "📊"}
                </span>
                {showAttendancePanel ? "Đóng bảng" : "Xem điểm danh"}
              </button>
            </div>
          )}

          {/* Bảng điểm danh mini (Cửa sổ theo dõi) */}
          {showAttendancePanel && user?.role === "teacher" && (
            <div
              style={{
                width: "320px",
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderRadius: "16px",
                padding: "20px",
                border: "1px solid rgba(74, 222, 128, 0.4)",
                color: "white",
                maxHeight: "350px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(12px)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .attendance-table::-webkit-scrollbar {
                  width: 4px;
                }
                .attendance-table::-webkit-scrollbar-thumb {
                  background: rgba(74, 222, 128, 0.3);
                  border-radius: 10px;
                }
              `}</style>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "15px",
                    color: "#4ade80",
                  }}
                >
                  📋 Điểm danh hôm nay
                </span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#4ade80",
                      borderRadius: "50%",
                      animation: "pulse 2s infinite",
                    }}
                  ></div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Live
                  </span>
                </div>
              </div>
              <div
                className="attendance-table"
                style={{ overflowY: "auto", flex: 1 }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: "#64748b",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <th style={{ padding: "8px 4px" }}>Sinh viên</th>
                      <th style={{ padding: "8px 4px", textAlign: "center" }}>
                        Check
                      </th>
                      <th style={{ padding: "8px 4px", textAlign: "center" }}>
                        Out
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "#64748b",
                            fontStyle: "italic",
                          }}
                        >
                          Chưa có dữ liệu lớp
                        </td>
                      </tr>
                    ) : (
                      attendanceList.map((s, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            transition: "background 0.2s",
                          }}
                        >
                          <td style={{ padding: "10px 4px" }}>
                            <div
                              style={{ fontWeight: "600", color: "#f1f5f9" }}
                            >
                              {s.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {s.mssv}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 4px",
                              textAlign: "center",
                              fontSize: "16px",
                            }}
                          >
                            {s.isPresent ? "✅" : "❌"}
                          </td>
                          <td
                            style={{ padding: "10px 4px", textAlign: "center" }}
                          >
                            <span
                              style={{
                                padding: "2px 8px",
                                backgroundColor:
                                  s.leaveCount > 2
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : "rgba(255,255,255,0.03)",
                                color: s.leaveCount > 2 ? "#f87171" : "#94a3b8",
                                borderRadius: "8px",
                                fontSize: "11px",
                                fontWeight: "600",
                              }}
                            >
                              {s.leaveCount}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Media Control Buttons - Đặt bên trên camera */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={toggleCamera}
              style={{
                width: "45px",
                height: "45px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: isCamOn ? "#4ade80" : "#ef4444",
                color: "white",
                fontSize: "20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              title={isCamOn ? "Tắt camera" : "Bật camera"}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              📹
            </button>

            <button
              onClick={toggleMic}
              style={{
                width: "45px",
                height: "45px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: isMicOn ? "#4ade80" : "#ef4444",
                color: "white",
                fontSize: "20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              title={isMicOn ? "Tắt microphone" : "Bật microphone"}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              🎤
            </button>
          </div>

          {/* Camera Preview */}
          <div
            style={{
              width: "200px",
              height: "150px",
              backgroundColor: "#000",
              borderRadius: "12px",
              border: "2px solid #4ade80",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isCamOn ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Camera tắt
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classroom Chat */}
      <ClassroomChat
        isVisible={isChatVisible}
        onToggle={() => setIsChatVisible(!isChatVisible)}
        classId={classId}
      />

      <canvas
        ref={canvasRef}
        width={1280}
        height={960}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          backgroundColor: "#1a1b26",
          outline: "none",
        }}
      />
    </div>
  );
}
