import axios from 'axios';

const api = axios.create({
  baseURL: 'https://billingsoft-7p1r.onrender.com',
  timeout: 10000
});

// Request Interceptor - Add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || 
                  sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
