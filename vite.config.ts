import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import path from 'path'

// Cargar el .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// const API_URL = process.env.VITE_API_URL || 'localhost'

// if (API_URL.includes('localhost')) {
//   throw new Error('No puedes usar localhost en producción');
// }

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  }
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: `${API_URL}/api`,
  //       changeOrigin: true,
  //       rewrite: (path) => path.replace(/^\/api/, '')
  //     }
  //   }
  // }
})
