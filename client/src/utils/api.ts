const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const trimApiSuffix = (value: string) =>
  trimTrailingSlash(value).replace(/\/api$/i, "");

// Leave empty in dev so requests go through the Vite proxy.
export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || "",
);
export const SOCKET_URL = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || "",
);
export const REALTIME_BASE_URL = trimApiSuffix(SOCKET_URL || API_BASE_URL || "");
export const PEER_SERVER_URL = trimApiSuffix(
  import.meta.env.VITE_PEER_SERVER_URL || REALTIME_BASE_URL || "",
);
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";

export const getApiUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
};

export const getPeerConnectionOptions = () => {
  const peerPath = import.meta.env.VITE_PEER_PATH || "/peerjs";
  const configuredPeerUrl = trimTrailingSlash(PEER_SERVER_URL);

  // Nếu VITE_PEER_SERVER_URL có chứa path trùng với peerPath thì bỏ path đó đi
  const cleanPeerUrl = configuredPeerUrl.endsWith(peerPath)
    ? configuredPeerUrl.slice(0, -peerPath.length)
    : configuredPeerUrl;

  const baseUrl = cleanPeerUrl
    ? new URL(cleanPeerUrl)
    : new URL(window.location.origin);

  return {
    host: baseUrl.hostname,
    port: Number(baseUrl.port || (baseUrl.protocol === "https:" ? 443 : 80)),
    path: peerPath,
    secure: baseUrl.protocol === "https:",
  };
};

const defaultIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // TURN server miễn phí từ Open Relay Project (metered.ca)
  // Thay bằng TURN server của bạn nếu có
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export const getIceServers = () => {
  const rawIceServers = import.meta.env.VITE_ICE_SERVERS?.trim();
  if (!rawIceServers) {
    return defaultIceServers;
  }

  try {
    const parsedIceServers = JSON.parse(rawIceServers);
    return Array.isArray(parsedIceServers) && parsedIceServers.length > 0
      ? parsedIceServers
      : defaultIceServers;
  } catch (error) {
    console.warn(
      "Invalid VITE_ICE_SERVERS value, using default STUN servers.",
      error,
    );
    return defaultIceServers;
  }
};

// API utility to attach auth headers and handle invalid tokens.
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const fullUrl = getApiUrl(url);

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(fullUrl, config);

    // Clear invalid auth state and let AuthContext send the user back to login.
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload(); // Let AuthContext re-check auth state.
      throw new Error("Invalid token");
    }

    return response;
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
};

export default apiCall;
