// API utility để xử lý token và lỗi
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    
    // Nếu token không hợp lệ, xóa và redirect về login
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload(); // Reload để trigger AuthContext
      throw new Error('Token không hợp lệ');
    }
    
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

export default apiCall;