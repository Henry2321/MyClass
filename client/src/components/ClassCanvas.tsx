import { useEffect, useRef, useState } from "react"
import { useAuth } from '../contexts/AuthContext'
import ClassroomChat from './ClassroomChat'

interface ScreenShareState {
  isSharing: boolean
  sharerName: string
  sharerRole: 'teacher' | 'student'
  stream: MediaStream | null
}
import { useSocket } from "../contexts/SocketContext"
import { useVoice } from "../contexts/VoiceContext"

export default function ClassCanvas() {
  const { socket } = useSocket()
  // @ts-ignore
  const { peer, myStream, setMyStream, isPushingToTalk, setIsPushingToTalk, remoteStreams, makeCall } = useVoice()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Sử dụng useRef cho PTT để tránh stale closure trong game loop
  const isTalkingRef = useRef(false)
  useEffect(() => {
    isTalkingRef.current = isPushingToTalk
  }, [isPushingToTalk])
  const [isJoined, setIsJoined] = useState(false)
  const [userName, setUserName] = useState("")
  const [studentId, setStudentId] = useState("")
  const { user } = useAuth()
  const [selectedCharIndex, setSelectedCharIndex] = useState(0)

  const [screenShare, setScreenShare] = useState<ScreenShareState>({
    isSharing: false,
    sharerName: '',
    sharerRole: 'student',
    stream: null
  })
  // Media state cho cam/mic preview
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isCamOn, setIsCamOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  
  // Chat state
  const [isChatVisible, setIsChatVisible] = useState(true)

  // Tự động đồng bộ localStream vào VoiceContext khi có thay đổi (sau khi đã Join)
  useEffect(() => {
    if (isJoined) {
      setMyStream(localStream);
      
      // Nếu vừa bật Mic, hãy thực hiện cuộc gọi lại cho tất cả người chơi khác 
      // để đảm bảo họ nghe thấy mình
      if (localStream && (isMicOn || isCamOn) && peer) {
        remotePlayers.current.forEach(p => {
          if (p.peerId) {
            makeCall(p.peerId, localStream);
          }
        });
      }
    }
  }, [localStream, isJoined, isMicOn, isCamOn, peer]);

  // useEffect để gán stream vào video element mỗi khi stream hoặc trạng thái cam thay đổi
  useEffect(() => {
    if (isCamOn && localStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = localStream;
    }
  }, [isCamOn, localStream]);

  const toggleCamera = async () => {
    try {
      if (isCamOn) {
        localStream?.getVideoTracks().forEach(track => track.stop())
        if (!isMicOn) {
          localStream?.getTracks().forEach(track => track.stop())
          setLocalStream(null)
        }
        setIsCamOn(false)
      } else {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280, max: 1920 }, 
            height: { ideal: 720, max: 1080 },
            facingMode: 'user'
          }, 
          audio: isMicOn 
        })
        
        console.log('Camera access granted:', stream);
        
        if (localStream) {
          // Nếu đã có mic, thêm track video vào stream hiện tại
          stream.getVideoTracks().forEach(track => localStream.addTrack(track))
          // Quan trọng: Phải gán lại để trigger useEffect
          setLocalStream(new MediaStream(localStream.getTracks()))
        } else {
          setLocalStream(stream)
        }
        setIsCamOn(true)
      }
    } catch (err: any) {
      console.error("Lỗi bật camera:", err)
      
      // Xử lý các loại lỗi cụ thể
      if (err?.name === 'NotAllowedError') {
        alert("Bạn đã từ chối quyền truy cập camera. Vui lòng:\n1. Click vào biểu tượng khóa 🔒 trên thanh địa chỉ\n2. Chọn 'Allow' cho Camera\n3. Refresh trang và thử lại")
      } else if (err?.name === 'NotFoundError') {
        alert("Không tìm thấy camera. Vui lòng kiểm tra:\n1. Camera có được kết nối không\n2. Driver camera đã được cài đặt chưa")
      } else if (err?.name === 'NotReadableError') {
        alert("Camera đang được sử dụng bởi ứng dụng khác. Vui lòng:\n1. Đóng các ứng dụng khác (Zoom, Teams, Skype)\n2. Thử lại")
      } else if (err?.name === 'OverconstrainedError') {
        alert("Cài đặt camera không hỗ trợ. Đang thử với cài đặt thấp hơn...")
        
        // Thử lại với cài đặt đơn giản hơn
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: isMicOn 
          })
          setLocalStream(fallbackStream)
          setIsCamOn(true)
        } catch (fallbackErr) {
          console.error('Fallback camera failed:', fallbackErr);
          alert("Không thể truy cập camera với bất kỳ cài đặt nào!")
        }
      } else {
        alert(`Lỗi camera: ${err?.message || 'Không xác định'}. Vui lòng kiểm tra quyền truy cập hoặc thiết bị.`)
      }
    }
  }

  const toggleMic = async () => {
    try {
      if (isMicOn) {
        localStream?.getAudioTracks().forEach(track => {
          track.stop();
          localStream.removeTrack(track);
        })
        if (!isCamOn) {
          localStream?.getTracks().forEach(track => track.stop())
          setLocalStream(null)
        }
        setIsMicOn(false)
      } else {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, 
          video: false 
        })
        
        console.log('Microphone access granted:', stream);
        
        if (localStream) {
          stream.getAudioTracks().forEach(track => localStream.addTrack(track))
          setLocalStream(new MediaStream(localStream.getTracks()))
        } else {
          setLocalStream(stream)
        }
        setIsMicOn(true)
      }
    } catch (err: any) {
      console.error("Lỗi bật mic:", err)
      
      if (err?.name === 'NotAllowedError') {
        alert("Bạn đã từ chối quyền truy cập microphone. Vui lòng:\n1. Click vào biểu tượng khóa 🔒 trên thanh địa chỉ\n2. Chọn 'Allow' cho Microphone\n3. Refresh trang và thử lại")
      } else if (err?.name === 'NotFoundError') {
        alert("Không tìm thấy microphone. Vui lòng kiểm tra thiết bị âm thanh.")
      } else if (err?.name === 'NotReadableError') {
        alert("Microphone đang được sử dụng bởi ứng dụng khác.")
      } else {
        alert(`Lỗi microphone: ${err?.message || 'Không thể truy cập microphone!'}`)
      }
    }
  }

  // Screen sharing functions - Đưa ra ngoài useEffect
  const handleScreenShare = async () => {
    try {
      console.log('Attempting to share screen...');
      
      // Kiểm tra browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Trình duyệt không hỗ trợ chia sẻ màn hình!');
        return;
      }

      // Kiểm tra nếu giáo viên đang share thì học sinh không được share
      if (screenShare.isSharing && screenShare.sharerRole === 'teacher' && user?.role === 'student') {
        alert('Giáo viên đang trình chiếu. Bạn không thể share màn hình!')
        return
      }

      // Kiểm tra nếu ai đó khác đang share (trừ giáo viên)
      if (screenShare.isSharing && screenShare.sharerName !== userName) {
        if (user?.role === 'teacher') {
          // Giáo viên có thể gạt share của học sinh
          stopScreenShare()
        } else {
          alert(`${screenShare.sharerName} đang trình chiếu. Vui lòng chờ!`)
          return
        }
      }

      if (screenShare.isSharing && screenShare.sharerName === userName) {
        // Dừng share
        stopScreenShare()
      } else {
        // Bắt đầu share
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        })

        console.log('Screen share stream obtained:', stream);

        setScreenShare({
          isSharing: true,
          sharerName: userName,
          sharerRole: user?.role || 'student',
          stream: stream
        })

        // Lắng nghe khi user dừng share từ browser
        stream.getVideoTracks()[0].onended = () => {
          console.log('Screen share ended by user');
          stopScreenShare()
        }
      }
    } catch (error: any) {
      console.error('Lỗi khi share màn hình:', error)
      
      // Xử lý các loại lỗi cụ thể
      if (error?.name === 'NotAllowedError') {
        alert('Bạn đã từ chối quyền chia sẻ màn hình. Vui lòng cho phép và thử lại!')
      } else if (error?.name === 'NotSupportedError') {
        alert('Trình duyệt không hỗ trợ chia sẻ màn hình!')
      } else if (error?.name === 'NotFoundError') {
        alert('Không tìm thấy nguồn màn hình để chia sẻ!')
      } else {
        alert('Không thể share màn hình. Vui lòng thử lại!')
      }
    }
  }

  const stopScreenShare = () => {
    console.log('Stopping screen share...');
    if (screenShare.stream) {
      screenShare.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      })
    }
    setScreenShare({
      isSharing: false,
      sharerName: '',
      sharerRole: 'student',
      stream: null
    })
  }

  const characters = ["adam", "ash", "lucy", "nancy"]
  
  const player = useRef({
    x: 104,
    y: 600,
    speed: 3
  })

  const keys = useRef<Set<string>>(new Set())
  const isSitting = useRef(false)
  const currentDir = useRef(0)
  const isMoving = useRef(false)
  const canSit = useRef(false)
  const seatPos = useRef({ x: 0, y: 0 })
  const frameX = useRef(0)
  const frameTimer = useRef(0)

  // Multiplayer: Lưu trữ danh sách người chơi khác
  const remotePlayers = useRef<Map<string, any>>(new Map())
  const remotePlayerImages = useRef<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    if (!isJoined) return
    if (!isJoined || !socket) return // Không chạy game loop nếu chưa join hoặc chưa có socket

    // Join classroom via socket
    socket.emit('join_classroom', {
      classId: 'main-class', // Hardcoded classId for now
      user: {
        id: studentId,
        name: userName,
        avatar: characters[selectedCharIndex],
        peerId: `peer-${socket.id}`
      }
    })

    socket.on('current_players', (players: any[]) => {
      players.forEach(p => {
        if (p.id !== socket.id) {
          remotePlayers.current.set(p.id, p)
          if (!remotePlayerImages.current.has(p.avatar)) {
            const img = new Image()
            img.src = `/sprites/${p.avatar}.png`
            remotePlayerImages.current.set(p.avatar, img)
          }

          // Thử gọi người chơi cũ sau một khoảng trễ ngắn để đảm bảo Peer đã ổn định
          setTimeout(() => {
            if (peer && myStream && p.peerId) {
              makeCall(p.peerId, myStream)
            }
          }, 1500)
        }
      })
    })

    socket.on('player_joined', (p: any) => {
      remotePlayers.current.set(p.id, p)
      if (!remotePlayerImages.current.has(p.avatar)) {
        const img = new Image()
        img.src = `/sprites/${p.avatar}.png`
        remotePlayerImages.current.set(p.avatar, img)
      }

      // Tự động gọi người chơi mới gia nhập
      setTimeout(() => {
        if (peer && myStream && p.peerId) {
          makeCall(p.peerId, myStream)
        }
      }, 1000)
    })

    socket.on('player_moved', (p: any) => {
      if (remotePlayers.current.has(p.id)) {
        // Cập nhật mọi thông tin bao gồm cả isTalking
        const existing = remotePlayers.current.get(p.id)
        remotePlayers.current.set(p.id, { ...existing, ...p })
      }
    })

    socket.on('player_left', (id: string) => {
      remotePlayers.current.delete(id)
    })

    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    
    canvas.tabIndex = 1
    canvas.style.outline = "none"

    const tileSize = 32

    interface MapLayer { data: number[]; name: string }
    interface MapData { width: number; height: number; layers: MapLayer[] }

    let mapData: MapData | null = null

    const tilesets = [
      { firstgid: 1,    img: new Image(), src: "/tiles/FloorAndGround.png" },
      { firstgid: 2561, img: new Image(), src: "/tiles/Classroom_and_library.png" },
      { firstgid: 3105, img: new Image(), src: "/tiles/Generic.png" },
      { firstgid: 4353, img: new Image(), src: "/tiles/Modern_Office_Black_Shadow.png" },
      { firstgid: 5201, img: new Image(), src: "/tiles/whiteboard.png" },
      { firstgid: 5213, img: new Image(), src: "/tiles/Basement.png" }
    ]
    tilesets.forEach(t => { t.img.src = t.src })

    fetch("/maps/classroom1.tmj")
      .then(r => r.json())
      .then(data => { mapData = data })

    const playerImg = new Image()
    playerImg.src = `/sprites/${characters[selectedCharIndex]}.png`

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bắt cả key và code để tăng độ chính xác
      const key = e.key.toLowerCase()
      const code = e.code.toLowerCase()
      
      keys.current.add(key)
      keys.current.add(code)
      
      // Chỉ chặn scroll trang nếu đang tập trung vào Canvas
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key) || ["arrowup", "arrowdown", "arrowleft", "arrowright", "space"].includes(code)) {
        e.preventDefault()
      }

      if ((key === "h" || code === "keyh") && !e.repeat) {
        if (isSitting.current) {
          isSitting.current = false
          player.current.y += 16
        } else if (canSit.current) {
          isSitting.current = true
          // Giữ nguyên hướng đã xác định trong update()
          player.current.x = seatPos.current.x
          player.current.y = seatPos.current.y
        }
      }

      // Phím S để share màn hình khi đang ngồi
      if ((key === "s" || code === "keys") && !e.repeat && isSitting.current) {
        e.preventDefault()
        handleScreenShare()
      }
      
      // Push to Talk: Giữ G để nói
      if (key === "g" || code === "keyg") {
        if (!isTalkingRef.current) {
          console.log("PTT ON");
          setIsPushingToTalk(true);
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const code = e.code.toLowerCase()

      keys.current.delete(key)
      keys.current.delete(code)

      if (key === "g" || code === "keyg") {
        console.log("PTT OFF");
        setIsPushingToTalk(false)
      }
    }

    const handleBlur = () => {
      keys.current.clear()
    }

    // TÁCH BIỆT HOÀN TOÀN: Đưa sự kiện về Canvas thay vì Window
    canvas.addEventListener("keydown", handleKeyDown)
    canvas.addEventListener("keyup", handleKeyUp)
    canvas.addEventListener("blur", handleBlur)
    
    // Tự động focus vào canvas khi người dùng click vào vùng game
    const handleCanvasClick = () => {
      canvas.focus()
    }
    canvas.addEventListener("click", handleCanvasClick)

    // Screen sharing functions - Đã di chuyển ra ngoài useEffect

    function update(){
      canSit.current = false
      if (mapData) {
        const tx = Math.floor((player.current.x + 16) / tileSize)
        const ty = Math.floor((player.current.y + 40) / tileSize)

        if (tx >= 0 && tx < mapData.width && ty >= 0 && ty < mapData.height) {
          // Debug: Luôn hiển thị thông tin vị trí hiện tại
          const currentIndex = ty * mapData.width + tx
          
          // Kiểm tra tất cả các layer tại vị trí hiện tại
          console.log(`Player position: (${tx}, ${ty})`);
          for (const layer of mapData.layers) {
            const layerName = (layer as any).name
            const tile = layer.data[currentIndex]
            if (tile !== 0) {
              console.log(`Layer "${layerName}" has tile: ${tile}`);
            }
          }
          
          // Chỉ kiểm tra ghế khi không đang ngồi
          if (!isSitting.current) {
            // Kiểm tra xung quanh có bàn học không (bán kính 3 ô)
            for (let dy = -3; dy <= 3; dy++) {
              for (let dx = -3; dx <= 3; dx++) {
                if (dx === 0 && dy === 0) continue // Bỏ qua vị trí hiện tại
                
                const checkTx = tx + dx
                const checkTy = ty + dy
                
                if (checkTx >= 0 && checkTx < mapData.width && checkTy >= 0 && checkTy < mapData.height) {
                  const checkIndex = checkTy * mapData.width + checkTx
                  
                  // Kiểm tra layer "Class" cho bàn học
                  for (const layer of mapData.layers) {
                    if ((layer as any).name === "Class") {
                      const deskTile = layer.data[checkIndex]
                      // Mở rộng range để bao gồm các tile bàn học khác
                      if ((deskTile >= 4423 && deskTile <= 4457) || 
                          (deskTile >= 3900 && deskTile <= 4000) || 
                          deskTile === 3948) { // Bàn học
                        canSit.current = true
                        
                        // Xác định hướng ngồi - luôn quay về phía trái
                        currentDir.current = 2 // Luôn ngồi hướng trái
                        
                        seatPos.current = { x: tx * tileSize, y: ty * tileSize }
                        console.log(`Found desk at offset (${dx}, ${dy}), tile: ${deskTile}, can sit! Direction: ${currentDir.current}`);
                        break
                      }
                    }
                  }
                  if (canSit.current) break
                }
              }
              if (canSit.current) break
            }
          }
        }
      }

      if (isSitting.current) {
        isMoving.current = false
        return
      }
      
      isMoving.current = false
      let moveX = 0
      let moveY = 0

      if(keys.current.has("arrowup") || keys.current.has("w") || keys.current.has("keyw")) moveY = -1
      if(keys.current.has("arrowdown") || keys.current.has("s") || keys.current.has("keys")) moveY = 1
      if(keys.current.has("arrowleft") || keys.current.has("a") || keys.current.has("keya")) moveX = -1
      if(keys.current.has("arrowright") || keys.current.has("d") || keys.current.has("keyd")) moveX = 1

      if (moveX !== 0 || moveY !== 0) {
        const spd = player.current.speed
        const nextX = player.current.x + moveX * spd
        const nextY = player.current.y + moveY * spd

        if (moveX !== 0) {
          let canMoveX = true
          // Kiểm tra boundary
          if (nextX < 0 || nextX > 1280 - 32) canMoveX = false
          
          // Kiểm tra collision với vật cản
          if (canMoveX && mapData) {
            const tx = Math.floor((nextX + 16) / tileSize)
            const ty = Math.floor((player.current.y + 44) / tileSize)
            const index = ty * mapData.width + tx
            
            if (index >= 0 && index < mapData.width * mapData.height) {
              // Kiểm tra collision trong layer "Class" (bàn học)
              for (const layer of mapData.layers) {
                const name = (layer as any).name
                if (name === "Class") {
                  const tile = layer.data[index]
                  if (tile >= 4423 && tile <= 4457) { // Các tile của bàn học
                    canMoveX = false
                    break
                  }
                }
              }
              
              // Kiểm tra collision trong layer "cảnh vật" (kệ sách, bảng)
              if (canMoveX) {
                for (const layer of mapData.layers) {
                  const name = (layer as any).name
                  if (name === "cảnh vật") {
                    const tile = layer.data[index]
                    // Các tile cản tránh: kệ sách (2977-2995), bảng (5213-5247)
                    if ((tile >= 2977 && tile <= 2995) || (tile >= 5213 && tile <= 5247)) {
                      canMoveX = false
                      break
                    }
                  }
                }
              }
            }
          }
          if (canMoveX) { player.current.x = nextX; isMoving.current = true; }
        }

        if (moveY !== 0) {
          let canMoveY = true
          // Kiểm tra boundary
          if (nextY < 80 || nextY > 840) canMoveY = false
          
          // Kiểm tra collision với vật cản
          if (canMoveY && mapData) {
            const tx = Math.floor((player.current.x + 16) / tileSize)
            const ty = Math.floor((nextY + 44) / tileSize)
            const index = ty * mapData.width + tx
            
            if (index >= 0 && index < mapData.width * mapData.height) {
              // Kiểm tra collision trong layer "Class" (bàn học)
              for (const layer of mapData.layers) {
                const name = (layer as any).name
                if (name === "Class") {
                  const tile = layer.data[index]
                  if (tile >= 4423 && tile <= 4457) { // Các tile của bàn học
                    canMoveY = false
                    break
                  }
                }
              }
              
              // Kiểm tra collision trong layer "cảnh vật" (kệ sách, bảng)
              if (canMoveY) {
                for (const layer of mapData.layers) {
                  const name = (layer as any).name
                  if (name === "cảnh vật") {
                    const tile = layer.data[index]
                    // Các tile cần tránh: kệ sách (2977-2995), bảng (5213-5247)
                    if ((tile >= 2977 && tile <= 2995) || (tile >= 5213 && tile <= 5247)) {
                      canMoveY = false
                      break
                    }
                  }
                }
              }
            }
          }
          if (canMoveY) { player.current.y = nextY; isMoving.current = true; }
        }

        if (moveY < 0) currentDir.current = 1
        else if (moveY > 0) currentDir.current = 0
        else if (moveX < 0) currentDir.current = 2
        else if (moveX > 0) currentDir.current = 3
      }

      if(isMoving.current){
        frameTimer.current++
        if(frameTimer.current > 8){
          frameX.current = (frameX.current + 1) % 6
          frameTimer.current = 0
        }
      } else {
        frameX.current = 0
      }
    }

    function getTileset(tile: number) {
      let selected = tilesets[0]
      for (const ts of tilesets) { if (tile >= ts.firstgid) selected = ts }
      return selected
    }

    function drawMap(){
      if(!mapData)return
      
      for(const layer of mapData.layers){
        const name = (layer as any).name
        if (name === "Floor") {
          drawLayer(layer)
        }
      }

      for(const layer of mapData.layers){
        const name = (layer as any).name
        if (name === "Class" || name === "Objects") {
          drawLayer(layer)
        }
      }

      const playerFeetY = player.current.y + 44
      
      for(const layer of mapData.layers){
        const name = (layer as any).name
        if (name === "cảnh vật" || name === "cảnh vật") {
          drawLayerCustom(layer, (tileY) => tileY + 24 <= playerFeetY)
        }
      }

      drawPlayer()

      // Vẽ các người chơi khác
      remotePlayers.current.forEach(p => {
        drawRemotePlayer(p)
      })

      for(const layer of mapData.layers){
        const name = (layer as any).name
        if (name === "cảnh vật" || name === "cảnh vật") {
          drawLayerCustom(layer, (tileY) => tileY + 24 > playerFeetY)
        }
      }
    }

    function drawLayerCustom(layer: MapLayer, condition: (tileY: number) => boolean) {
      if(!mapData) return
      for(let i=0;i<layer.data.length;i++){
        const tile=layer.data[i]
        if(tile===0)continue
        const mapWidth=mapData.width
        const x=(i%mapWidth)*tileSize
        const y=Math.floor(i/mapWidth)*tileSize
        
        if (!condition(y)) continue

        const tileset=getTileset(tile)
        if(!tileset.img.complete)continue
        const tileIndex=tile-tileset.firstgid
        const tilesPerRow=Math.floor(tileset.img.width/tileSize)
        const sx=(tileIndex%tilesPerRow)*tileSize
        const sy=Math.floor(tileIndex/tilesPerRow)*tileSize
        ctx.drawImage(
          tileset.img,
          sx,
          sy,
          tileSize,
          tileSize,
          x,
          y,
          tileSize,
          tileSize
        )
      }
    }

    function drawLayer(layer: MapLayer) {
      drawLayerCustom(layer, () => true)
    }

    function drawPlayer(){
      if(!playerImg.complete)return
      const frameWidth=32
      const frameHeight=48
      
      let actualFrameX = 0
      
      if (isSitting.current) {
        // Tư thế ngồi dựa trên hướng
        const sitMap = [48, 51, 49, 50] // [xuống, lên, trái, phải]
        actualFrameX = sitMap[currentDir.current]
      } else if (isMoving.current) {
        const runStarts = [24, 42, 30, 36]
        actualFrameX = runStarts[currentDir.current] + frameX.current
      } else { 
        const idleStarts = [0, 18, 6, 12]
        actualFrameX = idleStarts[currentDir.current] + frameX.current
      }

      if (actualFrameX >= 52) actualFrameX = 0

      ctx.drawImage(
        playerImg,
        actualFrameX * frameWidth,
        0,
        frameWidth,
        frameHeight,
        player.current.x,
        player.current.y,
        frameWidth,
        frameHeight
      )

      if (userName) {
        ctx.font = "bold 12px Arial"
        const textWidth = ctx.measureText(userName).width
        
        ctx.beginPath()
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.roundRect(
          player.current.x + (frameWidth / 2) - (textWidth / 2) - 5, 
          player.current.y - 20, 
          textWidth + 10, 
          16, 
          4
        )
        ctx.fill()
        ctx.closePath()

        ctx.fillStyle = "white"
        ctx.textAlign = "center"
        ctx.fillText(
          userName, 
          player.current.x + (frameWidth / 2), 
          player.current.y - 8
        )
        ctx.textAlign = "start"
      }
      
      // Vẽ tên trên đầu nhân vật - SỬ DỤNG isTalkingRef để đảm bảo UI đồng bộ
      drawNameTag(userName, player.current.x, player.current.y, frameWidth, isTalkingRef.current)
    }

    function drawRemotePlayer(p: any) {
      const img = remotePlayerImages.current.get(p.avatar)
      if (!img || !img.complete) return

      const frameWidth = 32
      const frameHeight = 48
      let actualFrameX = 0

      // Hướng quay giống local player
      if (p.isMoving) {
        const runStarts = [24, 42, 30, 36]
        actualFrameX = runStarts[p.direction] + p.frame
      } else {
        const idleStarts = [0, 18, 6, 12]
        actualFrameX = idleStarts[p.direction] + p.frame
      }

      if (actualFrameX >= 52) actualFrameX = 0

      ctx.drawImage(
        img,
        actualFrameX * frameWidth,
        0,
        frameWidth,
        frameHeight,
        p.x,
        p.y,
        frameWidth,
        frameHeight
      )

      drawNameTag(p.name, p.x, p.y, frameWidth, p.isTalking)
    }

    function drawNameTag(name: string, x: number, y: number, frameWidth: number, isTalking?: boolean) {
      if (!name) return
      ctx.font = "bold 12px Arial"
      const textWidth = ctx.measureText(name).width
      
      ctx.beginPath()
      ctx.fillStyle = isTalking ? "rgba(74, 222, 128, 0.8)" : "rgba(0, 0, 0, 0.5)"
      ctx.roundRect(
        x + (frameWidth / 2) - (textWidth / 2) - 5, 
        y - 20, 
        textWidth + 10, 
        16, 
        4
      )
      ctx.fill()
      ctx.closePath()

      ctx.fillStyle = "white"
      ctx.textAlign = "center"
      ctx.fillText(
        (isTalking ? "🎤 " : "") + name, 
        x + (frameWidth / 2), 
        y - 8
      )
      ctx.textAlign = "start"
    }

    function drawUI(){
      if (canSit.current && !isSitting.current) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(player.current.x - 35, player.current.y - 40, 110, 24)
        ctx.fillStyle = "white"
        ctx.font = "bold 11px Arial"
        ctx.fillText("Nhấn H để ngồi", player.current.x - 15, player.current.y - 24)
      }

      // Hiển thị UI share màn hình khi đang ngồi
      if (isSitting.current) {
        const canShare = !screenShare.isSharing || 
                        screenShare.sharerName === userName || 
                        (user?.role === 'teacher' && screenShare.sharerRole === 'student')
        
        if (canShare) {
          ctx.fillStyle = "rgba(0,0,0,0.7)"
          ctx.fillRect(player.current.x - 45, player.current.y - 40, 130, 24)
          ctx.fillStyle = "white"
          ctx.font = "bold 11px Arial"
          const text = screenShare.sharerName === userName ? "Nhấn S để dừng share" : "Nhấn S để share màn hình"
          ctx.fillText(text, player.current.x - 35, player.current.y - 24)
        }
      }

      // Hiển thị thông tin người đang share
      if (screenShare.isSharing) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"
        ctx.fillRect(10, 10, 300, 60)
        ctx.fillStyle = "#4ade80"
        ctx.font = "bold 16px Arial"
        ctx.fillText(`📺 ${screenShare.sharerName} đang trình chiếu`, 20, 35)
        ctx.fillStyle = "white"
        ctx.font = "12px Arial"
        ctx.fillText(`Vai trò: ${screenShare.sharerRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}`, 20, 55)
      }
    }

    let animationId: number
    let lastEmitTime = 0

    function loop(){
      ctx.clearRect(0,0,canvas.width,canvas.height)
      update()

      // Gửi vị trí cho server (throttle 30ms)
      const now = Date.now()
      if (now - lastEmitTime > 30 && socket) {
        socket.emit('move', {
          classId: 'main-class',
          x: player.current.x,
          y: player.current.y,
          frame: frameX.current,
          direction: currentDir.current,
          isMoving: isMoving.current,
          isTalking: isTalkingRef.current
        })
        lastEmitTime = now
      }

      drawMap()
      drawUI()
      animationId = requestAnimationFrame(loop)
    }

    if (playerImg.complete) {
      loop()
    } else {
      playerImg.onload = () => {
        loop()
      }
    }

    setTimeout(() => {
       if (!animationId) {
          loop()
       }
    }, 1000)

    return () => {
      canvas.removeEventListener("keydown", handleKeyDown)
      canvas.removeEventListener("keyup", handleKeyUp)
      canvas.removeEventListener("blur", handleBlur)
      canvas.removeEventListener("click", handleCanvasClick)
      cancelAnimationFrame(animationId)
      socket.off('current_players')
      socket.off('player_joined')
      socket.off('player_moved')
      socket.off('player_left')
    }

  }, [isJoined, userName, selectedCharIndex, socket, studentId])

  return(
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#1a1b26" }}>
      {!isJoined && (
        <div style={{
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
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
          <div style={{
            backgroundColor: "#20212b",
            padding: "40px",
            borderRadius: "20px",
            width: "650px",
            color: "white",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>
            <h2 style={{ marginBottom: "40px", fontSize: "24px", fontWeight: "500", color: "#e2e8f0" }}>
              Welcome To TDS Classroom
            </h2>
            
            <div style={{ display: "flex", gap: "40px", marginBottom: "40px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ 
                  backgroundColor: "#e5e7eb", 
                  borderRadius: "12px", 
                  width: "100%",
                  height: "220px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  marginBottom: "20px"
                }}>
                   <div style={{
                     width: "32px",
                     height: "48px",
                     backgroundImage: `url(/sprites/${characters[selectedCharIndex]}.png)`,
                     backgroundPosition: "0px 0px",
                     backgroundRepeat: "no-repeat",
                     transform: "scale(3.5)",
                     imageRendering: "pixelated"
                   }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "30px" }}>
                   <button 
                    onClick={() => setSelectedCharIndex((prev) => (prev - 1 + characters.length) % characters.length)}
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
                      justifyContent: "center"
                    }}>
                      ‹
                   </button>
                   <button 
                    onClick={() => setSelectedCharIndex((prev) => (prev + 1) % characters.length)}
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
                      justifyContent: "center"
                    }}>
                      ›
                   </button>
                </div>
              </div>

              <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "25px" }}>
                <div style={{ position: "relative", textAlign: "left" }}>
                  <div style={{ 
                    position: "absolute", 
                    top: "-10px", 
                    left: "12px", 
                    backgroundColor: "#20212b", 
                    padding: "0 5px", 
                    fontSize: "12px", 
                    color: "#4ade80",
                    zIndex: 1
                  }}>
                    Vai trò
                  </div>
                  <div style={{ 
                    width: "100%", 
                    backgroundColor: "#2a2b35", 
                    border: "1px solid #4ade80", 
                    borderRadius: "8px", 
                    padding: "14px 15px", 
                    color: "white",
                    fontSize: "15px",
                    textAlign: "center"
                  }}>
                    {user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                  </div>
                </div>

                <div style={{ position: "relative", textAlign: "left" }}>
                  <div style={{ 
                    position: "absolute", 
                    top: "-10px", 
                    left: "12px", 
                    backgroundColor: "#20212b", 
                    padding: "0 5px", 
                    fontSize: "12px", 
                    color: "#4ade80",
                    zIndex: 1
                  }}>
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
                      fontSize: "15px"
                    }} 
                  />
                </div>

                <div style={{ position: "relative", textAlign: "left" }}>
                  <div style={{ 
                    position: "absolute", 
                    top: "-10px", 
                    left: "12px", 
                    backgroundColor: "#20212b", 
                    padding: "0 5px", 
                    fontSize: "12px", 
                    color: "#4ade80",
                    zIndex: 1
                  }}>
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
                      fontSize: "15px"
                    }} 
                  />
                </div>



                {/* Video Preview Box */}
                <div style={{ 
                  backgroundColor: "#000", 
                  borderRadius: "12px", 
                  height: "160px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  border: "1px solid #333",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {isCamOn ? (
                    <video 
                      ref={videoPreviewRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  ) : (
                    <div style={{ color: "#555", fontSize: "13px" }}>Camera is off</div>
                  )}
                  
                  <div style={{ 
                    position: "absolute", 
                    bottom: "15px", 
                    width: "100%", 
                    display: "flex", 
                    justifyContent: "center", 
                    gap: "25px",
                    zIndex: 2
                  }}>
                    <span 
                      onClick={toggleCamera}
                      style={{ 
                        cursor: "pointer", 
                        fontSize: "20px", 
                        opacity: isCamOn ? 1 : 0.6,
                        filter: isCamOn ? "none" : "grayscale(100%)"
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
                        filter: isMicOn ? "none" : "grayscale(100%)"
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
                if (userName.trim() && studentId.trim()) {
                  // Tự động bật Mic khi Join nếu chưa bật
                  if (!isMicOn) {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCamOn });
                      if (localStream) {
                        stream.getAudioTracks().forEach(track => localStream.addTrack(track));
                        const newStream = new MediaStream(localStream.getTracks());
                        setLocalStream(newStream);
                        setMyStream(newStream);
                      } else {
                        setLocalStream(stream);
                        setMyStream(stream);
                      }
                      setIsMicOn(true);
                    } catch (err) {
                      console.error("Auto mic activation failed:", err);
                    }
                  } else {
                    setMyStream(localStream);
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
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseOut={(e) => e.currentTarget.style.filter = "none"}
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* Screen Share Display */}
      {screenShare.isSharing && screenShare.stream && (
        <div style={{
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
          flexDirection: "column"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
            color: "white"
          }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>
              📺 {screenShare.sharerName} đang chia sẻ màn hình
            </h3>
            <button
              onClick={stopScreenShare}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Đóng
            </button>
          </div>
          <video
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "8px"
            }}
            ref={(video) => {
              if (video && screenShare.stream) {
                video.srcObject = screenShare.stream;
              }
            }}
          />
        </div>
      )}

      {/* Media Controls - Hiển thị khi đã join */}
      {isJoined && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 1000
        }}>
          {/* Media Control Buttons - Đặt bên trên camera */}
          <div style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center"
          }}>
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
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
              }}
              title={isCamOn ? "Tắt camera" : "Bật camera"}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
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
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
              }}
              title={isMicOn ? "Tắt microphone" : "Bật microphone"}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🎤
            </button>
          </div>
          
          {/* Camera Preview */}
          <div style={{
            width: "200px",
            height: "150px",
            backgroundColor: "#000",
            borderRadius: "12px",
            border: "2px solid #4ade80",
            position: "relative",
            overflow: "hidden"
          }}>
            {isCamOn ? (
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <div style={{ 
                width: "100%", 
                height: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "#666",
                fontSize: "14px"
              }}>
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
          outline: "none"
        }}
      />
    </div>
  )
}