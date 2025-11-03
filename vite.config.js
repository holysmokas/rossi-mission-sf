import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ✅ Use your repo name here since it's a project site, not a user site
export default defineConfig({
  plugins: [react()],
  base: '/rossi-mission-sf/', // 👈 this tells Vite all paths are relative to /rossi-mission-sf/
});
