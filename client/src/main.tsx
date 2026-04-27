import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// #region agent log
fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H1',location:'client/src/main.tsx:6',message:'client boot (React mount)',data:{href:window.location.href},timestamp:Date.now()})}).catch(()=>{});
// #endregion

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
