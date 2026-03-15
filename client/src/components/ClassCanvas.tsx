import { useEffect, useRef, useState } from "react"

export default function ClassCanvas() {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [userName, setUserName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [selectedCharIndex, setSelectedCharIndex] = useState(0)

  const characters = ["adam", "ash", "lucy", "nancy"]
  
  const player = useRef({
    x: 400,
    y: 400,
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

  useEffect(() => {
    if (!isJoined) return

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
      const key = e.key.toLowerCase()
      const code = e.code.toLowerCase()
      
      keys.current.add(key)
      keys.current.add(code)
      
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "h"].includes(key) || 
          ["keyw", "keya", "keys", "keyd"].includes(code)) {
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
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase())
      keys.current.delete(e.code.toLowerCase())
    }

    const handleBlur = () => {
      keys.current.clear()
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    window.addEventListener("blur", handleBlur)

    function update(){
      canSit.current = false
      if (mapData) {
        const tx = Math.floor((player.current.x + 16) / tileSize)
        const ty = Math.floor((player.current.y + 40) / tileSize)

        if (tx >= 0 && tx < mapData.width && ty >= 0 && ty < mapData.height) {
          const index = ty * mapData.width + tx
          for (const layer of mapData.layers) {
            const name = (layer as any).name
            if (name === "Class" || name === "Objects" || name === "cảnh vật" || name === "cảnh vật") {
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

        const nextX = player.current.x + moveX * spd
        const nextY = player.current.y + moveY * spd

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
                if (ln === "cảnh vật" || ln === "cảnh vật") {
                  const tile = layer.data[index]
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

        if (moveY !== 0) {
          let canMoveY = true
          if (nextY < 80 || nextY > 840) canMoveY = false
          
          if (canMoveY && mapData) {
            const tx = Math.floor((player.current.x + 16) / tileSize)
            const ty = Math.floor((nextY + 44) / tileSize)
            const index = ty * mapData.width + tx
            if (index >= 0 && index < mapData.width * mapData.height) {
              for (const layer of mapData.layers) {
                const ln = (layer as any).name
                if (ln === "cảnh vật" || ln === "cảnh vật") {
                  const tile = layer.data[index]
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

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      update()
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
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
      window.removeEventListener("blur", handleBlur)
      cancelAnimationFrame(animationId)
    }

  }, [isJoined, userName, selectedCharIndex])

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
                  <div style={{ color: "#555", fontSize: "13px" }}>Camera is off</div>
                  <div style={{ 
                    position: "absolute", 
                    bottom: "15px", 
                    width: "100%", 
                    display: "flex", 
                    justifyContent: "center", 
                    gap: "25px" 
                  }}>
                    <span style={{ cursor: "pointer", fontSize: "20px", opacity: 0.6 }}>📹</span>
                    <span style={{ cursor: "pointer", fontSize: "20px", opacity: 0.6 }}>🎤</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (userName.trim() && studentId.trim()) {
                  setIsJoined(true)
                } else {
                  alert("Vui lòng nhập đầy đủ Tên và MSSV!")
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