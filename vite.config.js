import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Change 'rossi-mission-sf' to your GitHub repo name
  // When using a custom domain, set base to '/'
  base: '/',
})
