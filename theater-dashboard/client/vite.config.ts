import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 支持通过临时 Cloudflare Tunnel 对外演示，仍只限定为该域名后缀。
    allowedHosts: ['.trycloudflare.com'],
    proxy: { '/api': 'http://localhost:3001' },
  },
});
