export const APP_NAME = import.meta.env.VITE_APP_NAME || 'eBillSoft';

export const API_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
).replace(/\/$/, '');
