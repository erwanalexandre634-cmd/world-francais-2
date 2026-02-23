import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '../',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: true,
  },
});
