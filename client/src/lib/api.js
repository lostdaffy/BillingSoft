import axios from 'axios';
import { API_URL } from '../config';

const TOKEN_KEY = 'ebillsoft_token';
const LEGACY_TOKEN_KEY = 'token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode); session lasts for this tab only */
  }
};

const api = axios.create({ baseURL: API_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/public/'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !PUBLIC_PATHS.some((path) => url.startsWith(path))) {
      setToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }

    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'The server took too long to respond. Please try again.';
    } else if (!error.response) {
      error.message = 'Cannot reach the server. Please check your internet connection.';
    } else {
      error.message = 'Something went wrong. Please try again.';
    }
    return Promise.reject(error);
  }
);

export default api;
