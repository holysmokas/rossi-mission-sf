import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/rossi-mission-sf/',  // Replace with your repo name
  plugins: [react()],
})