import Phaser from "phaser"

// Tile IDs của ghế trong layer "Class" (Modern_Office_Black_Shadow, firstgid=4353)
// Ghế phía dưới bàn: 4423-4425 (top row), 4439-4441 (mid), 4455-4457 (bot)
// Ghế ngồi là tile trung tâm của mỗi nhóm ghế
const CHAIR_CENTER_TILES = [4424, 4440, 4456] // tile giữa của mỗi hàng ghế

const TILE_SIZE = 32
const SIT_RANGE = 40 // pixel, khoảng cách tối đa để ngồi

export default class ClassroomScene extends Phaser.Scene {

  player!: Phaser.Physics.Arcade.Sprite
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  hKey!: Phaser.Input.Keyboard.Key

  isSitting = false
  seatPositions: { x: number; y: number }[] = []
  sitHint!: Phaser.GameObjects.Text

  constructor() {
    super("ClassroomScene")
  }

  preload(){
    this.load.tilemapTiledJSON("classroom","/maps/classroom1.tmj")

    this.load.image("FloorAndGround","/tiles/FloorAndGround.png")
    this.load.image("Classroom_and_library","/tiles/Classroom_and_library.png")
    this.load.image("Generic","/tiles/Generic.png")
    this.load.image("Modern_Office_Black_Shadow","/tiles/Modern_Office_Black_Shadow.png")
    this.load.image("Basement","/tiles/Basement.png")
    this.load.image("whiteboard","/tiles/whiteboard.png")

    this.load.spritesheet("adam","/sprites/adam.png",{
      frameWidth:32,
      frameHeight:48
    })
  }

  create(){
    const map = this.make.tilemap({key:"classroom"})

    const tilesetNames = ["FloorAndGround", "Classroom_and_library", "Generic", "Modern_Office_Black_Shadow", "Basement", "whiteboard"]
    const tilesets: Phaser.Tilemaps.Tileset[] = []

    tilesetNames.forEach(name => {
      const ts = map.addTilesetImage(name, name)
      if (ts) tilesets.push(ts)
    })

    map.layers.forEach(layer => {
      map.createLayer(layer.name, tilesets, 0, 0)
    })

    // Thu thập vị trí ghế từ layer "Class"
    const classLayer = map.getLayer("Class")
    if (classLayer) {
      classLayer.data.forEach(row => {
        row.forEach(tile => {
          if (tile && CHAIR_CENTER_TILES.includes(tile.index)) {
            this.seatPositions.push({
              x: tile.pixelX + TILE_SIZE / 2,
              y: tile.pixelY + TILE_SIZE / 2
            })
          }
        })
      })
    }

    this.player = this.physics.add.sprite(200, 200, "adam")
    this.player.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.hKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H)

    this.anims.create({
      key:"down",
      frames:this.anims.generateFrameNumbers("adam",{start:0,end:2}),
      frameRate:8, repeat:-1
    })
    this.anims.create({
      key:"left",
      frames:this.anims.generateFrameNumbers("adam",{start:3,end:5}),
      frameRate:8, repeat:-1
    })
    this.anims.create({
      key:"right",
      frames:this.anims.generateFrameNumbers("adam",{start:6,end:8}),
      frameRate:8, repeat:-1
    })
    this.anims.create({
      key:"up",
      frames:this.anims.generateFrameNumbers("adam",{start:9,end:11}),
      frameRate:8, repeat:-1
    })

    // Hint text
    this.sitHint = this.add.text(0, 0, "Nhấn H để ngồi", {
      fontSize: "13px",
      backgroundColor: "#000000aa",
      color: "#ffffff",
      padding: { x: 6, y: 3 }
    }).setDepth(10).setVisible(false)

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
  }

  getNearestSeat(): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null
    let minDist = SIT_RANGE

    for (const seat of this.seatPositions) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, seat.x, seat.y
      )
      if (dist < minDist) {
        minDist = dist
        nearest = seat
      }
    }
    return nearest
  }

  update(){
    const speed = 160

    // Xử lý phím H
    if (Phaser.Input.Keyboard.JustDown(this.hKey)) {
      if (this.isSitting) {
        // Đứng dậy
        this.isSitting = false
        this.player.setVelocity(0)
        this.sitHint.setVisible(false)
        ;(this.player.body as Phaser.Physics.Arcade.Body).enable = true
      } else {
        const seat = this.getNearestSeat()
        if (seat) {
          this.isSitting = true
          this.player.setPosition(seat.x, seat.y)
          this.player.setVelocity(0)
          this.player.anims.stop()
          this.player.setFrame(0)
          ;(this.player.body as Phaser.Physics.Arcade.Body).enable = false
          this.sitHint.setVisible(false)
        }
      }
    }

    if (this.isSitting) return

    this.player.setVelocity(0)

    if(this.cursors.left?.isDown){
      this.player.setVelocityX(-speed)
      this.player.anims.play("left",true)
    }
    else if(this.cursors.right?.isDown){
      this.player.setVelocityX(speed)
      this.player.anims.play("right",true)
    }
    else if(this.cursors.up?.isDown){
      this.player.setVelocityY(-speed)
      this.player.anims.play("up",true)
    }
    else if(this.cursors.down?.isDown){
      this.player.setVelocityY(speed)
      this.player.anims.play("down",true)
    }
    else{
      this.player.anims.stop()
    }

    // Hiện hint khi gần ghế
    const seat = this.getNearestSeat()
    if (seat) {
      this.sitHint
        .setPosition(this.player.x - 40, this.player.y - 40)
        .setVisible(true)
    } else {
      this.sitHint.setVisible(false)
    }
  }
}
