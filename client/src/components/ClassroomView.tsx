import ClassCanvas from "./ClassCanvas"
import { useVoice } from "../contexts/VoiceContext"

export default function ClassroomView(){
  const { remoteStreams } = useVoice()

  return(

    <div
      style={{
        width: "calc(100% + 80px)",
        height: "calc(100% + 80px)",
        margin: "-40px",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        backgroundColor: "#1a1b26"
      }}
    >
      {/* Audio elements for remote players */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
        return (
          <audio 
            key={peerId} 
            autoPlay 
            controls={false}
            muted={false} // Đảm bảo không bị mute
            ref={(el) => { 
              if (el) {
                el.srcObject = stream;
                el.volume = 1.0; // Đảm bảo âm lượng tối đa
                // Ép trình duyệt phát âm thanh (xử lý autoplay policy)
                el.play().catch(e => {
                  console.error("Audio play failed for:", peerId, e);
                });
              }
            }} 
          />
        );
      })}

      {/* Full screen canvas */}
      <div style={{ 
        width: "100%", 
        height: "100%", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        overflow: "hidden"
      }}>
        <ClassCanvas />
      </div>
    </div>

  )

}