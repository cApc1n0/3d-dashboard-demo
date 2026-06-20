import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 注意:不再用「指向本地 three.module.js 的文件别名」。
// 原因:3d-force-graph 的依赖(three-render-objects)会 import 'three/examples/jsm/controls/*'、
// 'three/webgpu' 等子路径;文件别名会把 'three' 当文件,导致 'three/examples/...' 解析失败。
// 改用 npm three@0.184.0:其 package.json 的 exports 映射能正确解析全部子路径,且 node_modules 本身即离线可用。
const POISS_TARGET = process.env.VITE_POISS_TARGET || 'http://127.0.0.1:5124'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
  },
  server: {
    port: 5190,
    open: true,
    // 接真实 POISS 时(VITE_USE_REAL_API=true),浏览器侧 /api/* 与 /health 经代理转发到 POISS,
    // 规避 CORS(POISS 默认只允许 localhost:5124 同源)。target 可用 VITE_POISS_TARGET 覆盖。
    proxy: {
      '/api': { target: POISS_TARGET, changeOrigin: true },
      '/health': { target: POISS_TARGET, changeOrigin: true },
    },
  },
})
