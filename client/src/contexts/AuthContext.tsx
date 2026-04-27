import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { API_BASE_URL } from '../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    // #region agent log
    fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H2',location:'client/src/contexts/AuthContext.tsx:37',message:'auth init localStorage state',data:{tokenPresent:!!token,savedUserPresent:!!savedUser,tokenLen:token?token.length:0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    
    if (token && savedUser) {
      try {
        JSON.parse(savedUser);
        // Verify token is still valid by calling /api/auth/me
        verifyToken(token);
      } catch (error) {
        console.error('Error parsing saved user:', error);

        // #region agent log
        fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H2',location:'client/src/contexts/AuthContext.tsx:47',message:'auth init failed parsing saved user',data:{errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:''},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        clearAuthData();
      }
    }
    
    setLoading(false);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // #region agent log
      fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H2',location:'client/src/contexts/AuthContext.tsx:63',message:'verifyToken /api/auth/me response',data:{status:response.status,ok:response.ok},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      
      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        });
      } else {
        // Token không hợp lệ, xóa dữ liệu
        clearAuthData();
      }
    } catch (error) {
      console.error('Token verification failed:', error);

      // #region agent log
      fetch('http://127.0.0.1:7887/ingest/e94691c6-ad0a-42cd-9247-f9986cc7c541',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'687afc'},body:JSON.stringify({sessionId:'687afc',runId:'pre-debug',hypothesisId:'H3',location:'client/src/contexts/AuthContext.tsx:75',message:'verifyToken request failed',data:{errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:''},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      clearAuthData();
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = (userData: User) => {
    setUser(userData);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    clearAuthData();
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
