import axios from 'axios'

const api = axios.create({
  baseURL: 'https://billingsoft-l9s1.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
