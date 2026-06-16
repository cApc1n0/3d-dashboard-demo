import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 注意:不再用「指向本地 three.module.js 的文件别名」。
// 原因:3d-force-graph 的依赖(three-render-objects)会 import 'three/examples/jsm/controls/*'、
// 'three/webgpu' 等子路径;文件别名会把 'three' 当文件,导致 'three/examples/...' 解析成
// 'three.module.js/examples/...'(无效路径)。
// 改用 npm three@0.184.0:其 package.json 的 exports 映射能正确解析 'three'、'three/addons/*'、
// 'three/examples/*'、'three/webgpu' 等全部子路径,且 node_modules 本身即离线可用。
// (POISS Flask 集成阶段再按设计文档换 static/vendor + importmap。)
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
  },
  server: {
    port: 5190,
    open: true,
  },
})
