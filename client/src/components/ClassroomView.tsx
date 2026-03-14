import ClassCanvas from "./ClassCanvas"

export default function ClassroomView(){

  return(

    <div
      style={{
        width:"100%",
        height:"100%",
        overflow:"auto",
        padding: "20px"
      }}
    >
      <h2 className="title">Phòng học ảo</h2>
      <ClassCanvas />
    </div>

  )

}