import { useEffect, useRef } from "react"

export default function ClassCanvas() {

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {

    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    
    // Ensure canvas can receive focus for keyboard events if needed
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
    playerImg.src="/sprites/adam.png"

    const player={
      x:200,
      y:200,
      speed:4
    }

    let frameX=0
    let frameTimer=0
    let currentDir = 0 // Mapping based on user feedback: 0:down, 1:up, 2:left, 3:right
    let isMoving = false
    let isSitting = false
    let canSit = false
    let seatPos = { x: 0, y: 0 }

    const keys:Record<string,boolean>={}

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key // Use original key string
      keys[key] = true
      
      // Also store lowercase version for easier checking
      keys[key.toLowerCase()] = true

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", "h", "H"].includes(key)) {
        e.preventDefault()
      }

      // Handle Sit/Stand with 'H' - only on initial press, not repeat
      if (key.toLowerCase() === "h" && !e.repeat) {
        if (isSitting) {
          isSitting = false
        } else if (canSit) {
          isSitting = true
          // Force facing Up (towards teacher/blackboard)
          // Based on our 0:Right, 1:Up, 2:Left, 3:Down mapping
          currentDir = 1 
          // Snap exactly to seat with perfect offset
          player.x = seatPos.x
          player.y = seatPos.y - 12 // Centered on tile
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key
      keys[key] = false
      keys[key.toLowerCase()] = false
    }

    const handleBlur = () => {
      // Clear all keys when window loses focus
      for (const key in keys) {
        keys[key] = false
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    window.addEventListener("blur", handleBlur)

    function update(){
      // Scan for seats nearby
      canSit = false
      if (mapData) {
        // Use a slightly larger detection area for convenience
        const checkX = player.x + 16
        const checkY = player.y + 32
        
        const tx = Math.floor(checkX / tileSize)
        const ty = Math.floor(checkY / tileSize)

        if (tx >= 0 && tx < mapData.width && ty >= 0 && ty < mapData.height) {
          const index = ty * mapData.width + tx
          let tileFound = false
          for (const layer of mapData.layers) {
            const name = (layer as any).name
            if (name === "Class" || name === "Objects" || name === "cảnh vật") {
              if (layer.data[index] !== 0) {
                tileFound = true
                break
              }
            }
          }
          if (tileFound) {
            canSit = true
            seatPos = { x: tx * tileSize, y: ty * tileSize }
          }
        }
      }

      if (isSitting) {
        isMoving = false
        return
      }
      
      isMoving = false
      let moveX = 0
      let moveY = 0

      // Keyboard control - checking multiple possible key strings
      if(keys["ArrowUp"] || keys["w"]){
        moveY = -1
        currentDir = 1 // Up
        isMoving = true
      }
      else if(keys["ArrowDown"] || keys["s"]){
        moveY = 1
        currentDir = 3 // Down
        isMoving = true
      }
      
      if(keys["ArrowLeft"] || keys["a"]){
        moveX = -1
        currentDir = 2 // Left
        isMoving = true
      }
      else if(keys["ArrowRight"] || keys["d"]){
        moveX = 1
        currentDir = 0 // Right
        isMoving = true
      }

      if (isMoving) {
        player.x = Math.max(0, Math.min(1280 - 32, player.x + moveX * player.speed))
        player.y = Math.max(0, Math.min(960 - 48, player.y + moveY * player.speed))

        frameTimer++
        if(frameTimer > 6){
          frameX = (frameX + 1) % 6
          frameTimer = 0
        }
      } else {
        frameTimer++
        if(frameTimer > 10){
          frameX = (frameX + 1) % 6
          frameTimer = 0
        }
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
        for(let i=0;i<layer.data.length;i++){
          const tile=layer.data[i]
          if(tile===0)continue
          const mapWidth=mapData.width
          const x=(i%mapWidth)*tileSize
          const y=Math.floor(i/mapWidth)*tileSize
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
    }

    function drawPlayer(){
      if(!playerImg.complete)return
      const frameWidth=32
      const frameHeight=48
      
      let actualFrameX = 0
      
      if (isSitting) {
        // Mapping based on user feedback: 0:Right, 1:Up, 2:Left, 3:Down
        // Sprite indices: 48:Down, 49:Left, 50:Right, 51:Up
        const sitMap = [50, 51, 49, 48]
        actualFrameX = sitMap[currentDir]
      } else if (isMoving) {
        // Mapping: 0:Right, 1:Up, 2:Left, 3:Down
        // Sprite indices: 24:Down, 30:Left, 36:Right, 42:Up
        const runStarts = [36, 42, 30, 24]
        actualFrameX = runStarts[currentDir] + frameX
      } else {
        // Mapping: 0:Right, 1:Up, 2:Left, 3:Down
        // Sprite indices: 0:Down, 6:Left, 12:Right, 18:Up
        const idleStarts = [12, 18, 6, 0]
        actualFrameX = idleStarts[currentDir] + frameX
      }

      // Check for index overflow
      if (actualFrameX >= 52) actualFrameX = 0

      ctx.drawImage(
        playerImg,
        actualFrameX * frameWidth,
        0,
        frameWidth,
        frameHeight,
        player.x,
        player.y,
        frameWidth,
        frameHeight
      )
    }

    function drawUI(){
      if (canSit && !isSitting) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(player.x - 35, player.y - 40, 110, 24)
        ctx.fillStyle = "white"
        ctx.font = "bold 11px Arial"
        ctx.fillText("Nhấn H để ngồi", player.x - 15, player.y - 24)
      }
    }

    let animationId: number

    function loop(){
      ctx.clearRect(0,0,canvas.width,canvas.height)
      update()
      drawMap()
      drawPlayer()
      drawUI()
      animationId = requestAnimationFrame(loop)
    }

    // Force restart loop if it's not running
    if (playerImg.complete) {
      loop()
    } else {
      playerImg.onload = () => {
        loop()
      }
    }

    // Fallback if image load event is missed
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

  }, [])

  return(

    <canvas
      ref={canvasRef}
      width={1280}
      height={960}
      style={{border:"1px solid black"}}
    />

  )

}