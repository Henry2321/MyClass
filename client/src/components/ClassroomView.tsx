import ClassCanvas from "./ClassCanvas"

export default function ClassroomView(){

  return(

    <div
      style={{
        width: "calc(100% + 80px)",
        height: "calc(100% + 80px)", // using 100% to fill .main
        margin: "-40px",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white"
      }}
    >
      <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <ClassCanvas />
      </div>
    </div>

  )

}