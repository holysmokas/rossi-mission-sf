import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/rossi-mission-sf/',
  plugins: [react()],
  build: {
    outDir: 'docs'  // Change output from 'dist' to 'docs'
  }
})