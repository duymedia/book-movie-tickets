import { createContext, useContext, useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import config from '../config';
import { setAuthData, getAuthData, clearAuthData } from '../utils/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra auth data khi ứng dụng khởi động
  useEffect(() => {
    const authData = getAuthData();
    if (authData) {
      setUser(authData);
    }
    setLoading(false);
  }, []);

  // Hàm đăng nhập Google
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Gửi access_token tới backend để xác minh (tuỳ chọn)
        const res = await axios.post(
          `${config.api.baseURL}/auth/google`,
          { access_token: tokenResponse.access_token },
          { timeout: config.api.timeout }
        );

        const { email, authToken } = res.data; // Giả sử backend trả về email và token
        setAuthData({ email, authToken });
        setUser({ email, authToken });
      } catch (error) {
        console.error('Google login failed:', error);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
    },
  });

  // Hàm đăng xuất
  const logout = () => {
    clearAuthData();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);