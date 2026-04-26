import ClassCanvas from "./ClassCanvas"
import { useVoice } from "../contexts/VoiceContext"

export default function ClassroomView(){
  const { remoteStreams } = useVoice()

  return(

    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        display: "flex",
        backgroundColor: "#1a1b26",
        zIndex: 500
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