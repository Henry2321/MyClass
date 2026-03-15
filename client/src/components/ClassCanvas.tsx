import { useEffect, useRef, useState } from "react"
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
  const [selectedCharIndex, setSelectedCharIndex] = useState(0)

  // Media state cho cam/mic preview
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isCamOn, setIsCamOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: isMicOn 
        })
        
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
    } catch (err) {
      console.error("Lỗi bật camera:", err)
      alert("Không thể truy cập camera! Vui lòng kiểm tra quyền truy cập hoặc thiết bị.")
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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        })
        
        if (localStream) {
          stream.getAudioTracks().forEach(track => localStream.addTrack(track))
          setLocalStream(new MediaStream(localStream.getTracks()))
        } else {
          setLocalStream(stream)
        }
        setIsMicOn(true)
      }
    } catch (err) {
      console.error("Lỗi bật mic:", err)
      alert("Không thể truy cập microphone!")
    }
  }

  const characters = ["adam", "ash", "lucy", "nancy"]
  
  // Sử dụng useRef cho các biến state để đảm bảo vòng lặp game luôn đọc được giá trị mới nhất
  const player = useRef({
    x: 400,
    y: 400,
    speed: 3 // Giảm tốc độ di chuyển
  })

  const keys = useRef<Set<string>>(new Set())
  const isSitting = useRef(false)
  const currentDir = useRef(0) // 0: Down, 1: Up, 2: Left, 3: Right
  const isMoving = useRef(false)
  const canSit = useRef(false)
  const seatPos = useRef({ x: 0, y: 0 })
  const frameX = useRef(0)
  const frameTimer = useRef(0)

  // Multiplayer: Lưu trữ danh sách người chơi khác
  const remotePlayers = useRef<Map<string, any>>(new Map())
  const remotePlayerImages = useRef<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
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

    interface MapLayer{
      data:number[]
    }

    interface MapData{
      width:number
      height:number
      layers:MapLayer[]
    }

    let mapData:MapData|null = null

    const tilesets = [
      {firstgid:1,img:new Image(),src:"/tiles/FloorAndGround.png"},
      {firstgid:2561,img:new Image(),src:"/tiles/Classroom_and_library.png"},
      {firstgid:3105,img:new Image(),src:"/tiles/Generic.png"},
      {firstgid:4353,img:new Image(),src:"/tiles/Modern_Office_Black_Shadow.png"},
      {firstgid:5201,img:new Image(),src:"/tiles/whiteboard.png"},
      {firstgid:5213,img:new Image(),src:"/tiles/Basement.png"}
    ]

    tilesets.forEach(t=>{
      t.img.src=t.src
    })

    fetch("/maps/classroom1.tmj")
      .then(r=>r.json())
      .then(data=>{
        mapData=data
      })

    const playerImg = new Image()
    playerImg.src=`/sprites/${characters[selectedCharIndex]}.png`

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
          currentDir.current = 1 
          player.current.x = seatPos.current.x
          player.current.y = seatPos.current.y - 12
        }
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

    function update(){
      // Kiểm tra vị trí ngồi
      canSit.current = false
      if (mapData) {
        const tx = Math.floor((player.current.x + 16) / tileSize)
        const ty = Math.floor((player.current.y + 40) / tileSize)

        if (tx >= 0 && tx < mapData.width && ty >= 0 && ty < mapData.height) {
          const index = ty * mapData.width + tx
          for (const layer of mapData.layers) {
            const name = (layer as any).name
            if (name === "Class" || name === "Objects" || name === "cảnh vật" || name === "c\u1ea3nh v\u1eadt") {
              if (layer.data[index] !== 0) {
                canSit.current = true
                seatPos.current = { x: tx * tileSize, y: ty * tileSize }
                break
              }
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

        // Chặn tường trên và tường dưới theo tọa độ
        // Top wall around 80px, Bottom wall around 840px
        const nextX = player.current.x + moveX * spd
        const nextY = player.current.y + moveY * spd

        // Check horizontal
        if (moveX !== 0) {
          let canMoveX = true
          if (nextX < 0 || nextX > 1280 - 32) canMoveX = false
          
          if (canMoveX && mapData) {
            const tx = Math.floor((nextX + 16) / tileSize)
            const ty = Math.floor((player.current.y + 44) / tileSize)
            const index = ty * mapData.width + tx
            if (index >= 0 && index < mapData.width * mapData.height) {
              for (const layer of mapData.layers) {
                const ln = (layer as any).name
                if (ln === "cảnh vật" || ln === "c\u1ea3nh v\u1eadt") {
                  const tile = layer.data[index]
                  // Chỉ chặn nếu là TỦ SÁCH (3878-3896)
                  if (tile >= 3878 && tile <= 3896) {
                    canMoveX = false
                    break
                  }
                }
              }
            }
          }
          if (canMoveX) { player.current.x = nextX; isMoving.current = true; }
        }

        // Check vertical
        if (moveY !== 0) {
          let canMoveY = true
          // Chặn tường trên và tường dưới
          if (nextY < 80 || nextY > 840) canMoveY = false
          
          if (canMoveY && mapData) {
            const tx = Math.floor((player.current.x + 16) / tileSize)
            const ty = Math.floor((nextY + 44) / tileSize)
            const index = ty * mapData.width + tx
            if (index >= 0 && index < mapData.width * mapData.height) {
              for (const layer of mapData.layers) {
                const ln = (layer as any).name
                if (ln === "cảnh vật" || ln === "c\u1ea3nh v\u1eadt") {
                  const tile = layer.data[index]
                  // Chỉ chặn nếu là TỦ SÁCH (3878-3896)
                  if (tile >= 3878 && tile <= 3896) {
                    canMoveY = false
                    break
                  }
                }
              }
            }
          }
          if (canMoveY) { player.current.y = nextY; isMoving.current = true; }
        }

        // Cập nhật hướng quay (0:Down, 1:Up, 2:Left, 3:Right)
        if (moveY < 0) currentDir.current = 1 // Up
        else if (moveY > 0) currentDir.current = 0 // Down
        else if (moveX < 0) currentDir.current = 2 // Left
        else if (moveX > 0) currentDir.current = 3 // Right
      }

      if(isMoving.current){
        frameTimer.current++
        if(frameTimer.current > 8){
          frameX.current = (frameX.current + 1) % 6
          frameTimer.current = 0
        }
      } else {
        frameX.current = 0 // Idle frame
      }
    }

    function getTileset(tile:number){
      let selected=tilesets[0]
      for(const ts of tilesets){
        if(tile>=ts.firstgid){
          selected=ts
        }
      }
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
        if (name === "cảnh vật" || name === "c\u1ea3nh v\u1eadt") {
          // Draw tiles that are BEHIND the player feet (depth sorting)
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
        if (name === "cảnh vật" || name === "c\u1ea3nh v\u1eadt") {
          // Draw tiles that are IN FRONT OF the player feet (depth sorting)
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
      
      // Mapping: 0: Down, 1: Up, 2: Left, 3: Right
      if (isSitting.current) {
        const sitMap = [48, 51, 49, 50]
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
    }

    let animationId: number

    let lastEmitTime = 0

    function loop(){
      ctx.clearRect(0,0,canvas.width,canvas.height)
      update()

      // Gửi vị trí cho server (throttle 30ms)
      const now = Date.now()
      if (now - lastEmitTime > 30) {
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

  }, [isJoined, socket]) // Chạy lại useEffect khi isJoined hoặc socket thay đổi

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
              {/* Left Column: Character Selection */}
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
                   {/* Fix: Chỉ hiển thị 1 frame của nhân vật bằng background-image */}
                   <div style={{
                     width: "32px",
                     height: "48px",
                     backgroundImage: `url(/sprites/${characters[selectedCharIndex]}.png)`,
                     backgroundPosition: "0px 0px", // Frame đầu tiên (Idle Down)
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

              {/* Right Column: Inputs & Camera */}
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
                    Student ID (MSSV)
                  </div>
                  <input 
                    type="text" 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter MSSV..."
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