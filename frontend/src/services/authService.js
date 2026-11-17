// src/services/authService.js
import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
});

// Interceptor xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Đã có lỗi xảy ra';
    const status = error.response?.status;
    if (status === 401) {
      // Có thể xử lý đăng xuất tự động ở đây
      return Promise.reject({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
    }
    return Promise.reject({ success: false, message });
  }
);

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const googleLogin = async (idToken) => {
  const response = await api.post('/auth/google', { idToken });
  return response.data;
};