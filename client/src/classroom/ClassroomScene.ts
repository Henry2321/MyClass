import Phaser from "phaser"

export default class ClassroomScene extends Phaser.Scene {

  player!: Phaser.Physics.Arcade.Sprite
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super("ClassroomScene")
  }

  preload(){

    this.load.tilemapTiledJSON("classroom","/maps/classroom.json")

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
      if (ts) {
        tilesets.push(ts)
      } else {
        console.warn(`Could not load tileset: ${name}`)
      }
    })

    map.layers.forEach(layer=>{
      if (layer.type === "tilelayer") {
        const l = map.createLayer(layer.name, tilesets, 0, 0)
        if (!l) {
          console.error(`Could not create layer: ${layer.name}`)
        }
      }
    })

    this.player = this.physics.add.sprite(200,200,"adam")

    this.player.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()

    this.anims.create({
      key:"down",
      frames:this.anims.generateFrameNumbers("adam",{start:0,end:2}),
      frameRate:8,
      repeat:-1
    })

    this.anims.create({
      key:"left",
      frames:this.anims.generateFrameNumbers("adam",{start:3,end:5}),
      frameRate:8,
      repeat:-1
    })

    this.anims.create({
      key:"right",
      frames:this.anims.generateFrameNumbers("adam",{start:6,end:8}),
      frameRate:8,
      repeat:-1
    })

    this.anims.create({
      key:"up",
      frames:this.anims.generateFrameNumbers("adam",{start:9,end:11}),
      frameRate:8,
      repeat:-1
    })

  }

  update(){

    const speed = 160

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

  }

}