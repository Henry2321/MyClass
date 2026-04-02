import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:5000'

  return {
    plugins: [react(), basicSsl()],
    server: {
      host: true, // Allow LAN access during development.
      port: 5173,
      https: {},
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false // Cho phép self-signed certificates
        },
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false,
          ws: true
        },
        '/peerjs': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false,
          ws: true
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rejectUnauthorized: false
        }
      }
    }
  }
})
