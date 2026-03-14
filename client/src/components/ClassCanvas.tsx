import { useEffect, useRef } from "react"

export default function ClassCanvas() {

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {

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
    playerImg.src = "/sprites/adam.png"

    const player = { x: 100, y: 400, speed: 4 }

    let frameX = 0
    let frameTimer = 0
    let currentDir = 0
    let isMoving = false
    let isSitting = false
    let canSit = false
    let seatPos = { x: 0, y: 0, direction: 0 }

    // Collision tiles - chỉ block những thứ thực sự cần
    const COLLISION_TILES = new Set([
      // Chỉ block mặt bàn trung tâm (cho phép đi qua viền)
      4440, 4456,  // chỉ center và bottom center
      // Tủ sách lớn
      2977, 2978, 2979, 2993, 2994, 2995,
      // Bảng
      5213, 5214, 5215, 5229, 5230, 5231, 5245, 5246, 5247
    ])

    function isCollision(x: number, y: number): boolean {
      if (!mapData) return false
      const tileX = Math.floor(x / tileSize)
      const tileY = Math.floor(y / tileSize)
      if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) return true
      
      const index = tileY * mapData.width + tileX
      
      // Kiểm tra collision chỉ ở chân nhân vật (y + 40 đến y + 47)
      const footTileY = Math.floor((y + 40) / tileSize)
      const footIndex = footTileY * mapData.width + tileX
      
      for (const layer of mapData.layers) {
        if (footIndex >= 0 && footIndex < layer.data.length) {
          const tile = layer.data[footIndex]
          if (COLLISION_TILES.has(tile)) return true
        }
      }
      return false
    }
    const SIT_RANGE = 52

    const allSeats: { x: number; y: number; direction: number }[] = []
    let seatsBuilt = false

    function buildSeatList() {
      if (seatsBuilt || !mapData) return
      const classLayer = mapData.layers.find(l => l.name === "Class")
      const sceneryLayer = mapData.layers.find(l => l.name === "cảnh vật")
      if (!classLayer || !sceneryLayer) return
      seatsBuilt = true
      
      // Ghế từ bàn học sinh (tile 4456)
      for (let i = 0; i < classLayer.data.length; i++) {
        if (classLayer.data[i] === 4456) {
          const tx = i % mapData.width
          const ty = Math.floor(i / mapData.width)
          const centerX = tx * tileSize + tileSize / 2
          const centerY = ty * tileSize + tileSize / 2
          
          // 4 ghế xung quanh mỗi bàn học sinh
          allSeats.push(
            { x: centerX - 64, y: centerY, direction: 0 },      // trái cùng hàng
            { x: centerX + 64, y: centerY, direction: 2 },      // phải cùng hàng
            { x: centerX - 64, y: centerY - 64, direction: 0 }, // trái trên
            { x: centerX + 64, y: centerY - 64, direction: 2 }  // phải trên
          )
        }
      }
      
      // Ghế riêng lẻ từ layer cảnh vật - scan tất cả tile để debug
      const uniqueTiles = new Set<number>()
      for (let i = 0; i < sceneryLayer.data.length; i++) {
        const tile = sceneryLayer.data[i]
        if (tile !== 0) {
          const tx = i % mapData.width
          const ty = Math.floor(i / mapData.width)
          // Chỉ log tile ở khu vực bên phải (col > 25)
          if (tx > 25 && ty > 2 && ty < 25) {
            uniqueTiles.add(tile)
          }
        }
        
        // Tìm tất cả tile 2829 và thêm offset cho mỗi cái
        if (sceneryLayer.data[i] === 2829) {
          const tx = i % mapData.width
          const ty = Math.floor(i / mapData.width)
          // Thêm ghế tại vị trí gốc
          allSeats.push({
            x: tx * tileSize + tileSize,
            y: ty * tileSize + tileSize / 2,
            direction: 1
          })
          // Thêm ghế dịch chuyển (sang phải 11 tile, xuống 1 tile) - hướng trái
          allSeats.push({
            x: tx * tileSize + tileSize + 352,
            y: ty * tileSize + tileSize / 2 + 32,
            direction: 2  // hướng trái
          })
        }
      }
      console.log("[RIGHT AREA TILES]", [...uniqueTiles].sort((a,b)=>a-b))
      
      console.log("[SEATS]", allSeats.length)
    }

    function getNearestSeat(): { x: number; y: number; direction: number } | null {
      let nearest: { x: number; y: number; direction: number } | null = null
      let minDist = SIT_RANGE
      const px = player.x + 16
      const py = player.y + 32
      for (const seat of allSeats) {
        const dist = Math.hypot(px - seat.x, py - seat.y)
        if (dist < minDist) { minDist = dist; nearest = seat }
      }
      return nearest
    }

    const keys: Record<string, boolean> = {}

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true
      keys[e.key.toLowerCase()] = true
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","h"].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
      if (e.key.toLowerCase() === "h" && !e.repeat) {
        if (isSitting) {
          isSitting = false
        } else if (canSit) {
          isSitting = true
          currentDir = seatPos.direction  // hướng ngồi tự động
          player.x = seatPos.x - 16
          player.y = seatPos.y - 32
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false
      keys[e.key.toLowerCase()] = false
    }

    const handleBlur = () => { for (const k in keys) keys[k] = false }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    window.addEventListener("blur", handleBlur)

    function update() {
      buildSeatList()

      const nearSeat = getNearestSeat()
      canSit = nearSeat !== null
      if (nearSeat) seatPos = nearSeat

      if (isSitting) { isMoving = false; return }

      isMoving = false
      let moveX = 0, moveY = 0

      if (keys["ArrowUp"] || keys["w"]) { moveY = -1; currentDir = 1; isMoving = true }
      else if (keys["ArrowDown"] || keys["s"]) { moveY = 1; currentDir = 3; isMoving = true }
      if (keys["ArrowLeft"] || keys["a"]) { moveX = -1; currentDir = 2; isMoving = true }
      else if (keys["ArrowRight"] || keys["d"]) { moveX = 1; currentDir = 0; isMoving = true }

      if (isMoving) {
        const newX = Math.max(0, Math.min(1280 - 32, player.x + moveX * player.speed))
        const newY = Math.max(0, Math.min(960 - 48, player.y + moveY * player.speed))
        
        // Kiểm tra collision chỉ ở chân nhân vật
        const canMove = !isCollision(newX + 8, newY + 40) &&     // chân trái
                       !isCollision(newX + 24, newY + 40)       // chân phải
        
        if (canMove) {
          player.x = newX
          player.y = newY
        }
        
        frameTimer++
        if (frameTimer > 6) { frameX = (frameX + 1) % 6; frameTimer = 0 }
      } else {
        frameTimer++
        if (frameTimer > 10) { frameX = (frameX + 1) % 6; frameTimer = 0 }
      }
    }

    function getTileset(tile: number) {
      let selected = tilesets[0]
      for (const ts of tilesets) { if (tile >= ts.firstgid) selected = ts }
      return selected
    }

    function drawMap() {
      if (!mapData) return
      for (const layer of mapData.layers) {
        for (let i = 0; i < layer.data.length; i++) {
          const tile = layer.data[i]
          if (tile === 0) continue
          const x = (i % mapData.width) * tileSize
          const y = Math.floor(i / mapData.width) * tileSize
          const ts = getTileset(tile)
          if (!ts.img.complete) continue
          const idx = tile - ts.firstgid
          const cols = Math.floor(ts.img.width / tileSize)
          ctx.drawImage(ts.img, (idx % cols) * tileSize, Math.floor(idx / cols) * tileSize, tileSize, tileSize, x, y, tileSize, tileSize)
        }
      }
    }

    function drawPlayer() {
      if (!playerImg.complete) return
      const fw = 32, fh = 48
      let fx = 0
      if (isSitting) {
        const sitMap = [50, 51, 49, 48]
        fx = sitMap[currentDir]
      } else if (isMoving) {
        const runStarts = [36, 42, 30, 24]
        fx = runStarts[currentDir] + frameX
      } else {
        const idleStarts = [12, 18, 6, 0]
        fx = idleStarts[currentDir] + frameX
      }
      if (fx >= 52) fx = 0
      ctx.drawImage(playerImg, fx * fw, 0, fw, fh, player.x, player.y, fw, fh)
    }

    function drawUI() {
      if (canSit && !isSitting) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(player.x - 35, player.y - 40, 110, 24)
        ctx.fillStyle = "white"
        ctx.font = "bold 11px Arial"
        ctx.fillText("Nhấn H để ngồi", player.x - 15, player.y - 24)
      }
    }

    let animationId: number

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      update()
      drawMap()
      drawPlayer()
      drawUI()
      animationId = requestAnimationFrame(loop)
    }

    if (playerImg.complete) { loop() }
    else { playerImg.onload = () => { loop() } }
    setTimeout(() => { if (!animationId) loop() }, 1000)

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
      window.removeEventListener("blur", handleBlur)
      cancelAnimationFrame(animationId)
    }

  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={960}
      style={{ border: "1px solid black" }}
    />
  )
}
