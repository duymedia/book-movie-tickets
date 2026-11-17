// src/utils/storage.js
const STORAGE_KEY = 'auth';

export const setAuthData = ({ email, authToken }) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, authToken }));
};

export const getAuthData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearAuthData = () => {
  localStorage.removeItem(STORAGE_KEY);
};