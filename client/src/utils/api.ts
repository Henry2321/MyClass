const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

// Leave empty in dev so requests go through the Vite proxy.
export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
export const SOCKET_URL = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || '');
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/socket.io';

export const getApiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
};

export const getPeerConnectionOptions = () => {
  const configuredPeerUrl = trimTrailingSlash(import.meta.env.VITE_PEER_SERVER_URL || '');
  const baseUrl = configuredPeerUrl
    ? new URL(configuredPeerUrl, window.location.origin)
    : new URL(window.location.origin);

  const pathFromUrl = baseUrl.pathname && baseUrl.pathname !== '/' ? baseUrl.pathname : '/peerjs';

  return {
    host: baseUrl.hostname,
    port: Number(baseUrl.port || (baseUrl.protocol === 'https:' ? 443 : 80)),
    path: import.meta.env.VITE_PEER_PATH || pathFromUrl,
    secure: baseUrl.protocol === 'https:',
  };
};

// API utility to attach auth headers and handle invalid tokens.
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const fullUrl = getApiUrl(url);

  const defaultHeaders = {
    'Content-Type': 'application/json',
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload(); // Let AuthContext re-check auth state.
      throw new Error('Invalid token');
    }

    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

export default apiCall;
