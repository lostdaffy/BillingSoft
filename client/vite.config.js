import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://billingsoft-l9s1.onrender.com',  // Backend URL
        changeOrigin: true,
        secure: false
      }
    }
  }
})
