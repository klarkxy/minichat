import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 部署时 base 设为仓库名。
// 本地 dev 不会用到 base，所以默认占位即可；部署脚本会注入真实值。
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
  server: {
    port: 5173,
    open: false,
  },
})
