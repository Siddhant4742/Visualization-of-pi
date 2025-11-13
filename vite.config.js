import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Visualization-of-pi/',
  plugins: [react()],
  worker: {
    format: 'es'
  }
})
