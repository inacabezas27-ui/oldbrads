import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 7001,
    strictPort: true,
    // En desarrollo el front corre en 7001 y el servidor de IA en 7003.
    proxy: { '/api': { target: 'http://localhost:7003', changeOrigin: true } },
  },
})
