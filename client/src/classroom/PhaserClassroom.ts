import Phaser from "phaser"
import ClassroomScene from "./ClassroomScene"

export function startClassroom(container:HTMLDivElement){

  const game = new Phaser.Game({

    type:Phaser.AUTO,
    width:1280,
    height:960,
    parent:container,

    physics:{
      default:"arcade",
      arcade:{
        gravity:{x:0,y:0},
        debug:false
      }
    },

    scene:[ClassroomScene]

  })

  return game

}