// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import wasm from "vite-plugin-wasm"; // <--- 移除
// import topLevelAwait from "vite-plugin-top-level-await"; // <--- 移除

export default defineConfig({
  plugins: [
    vue(),
    // wasm(), // <--- 移除
    // topLevelAwait() // <--- 移除
  ],
  worker: {
    format: 'es', 
    // plugins: () => [ // <--- 移除 worker 特定的 wasm/topLevelAwait 插件
    //   wasm(),
    //   topLevelAwait()
    // ],
    // rollupOptions: { // <--- 这部分通常不需要了
    //   output: {
    //     inlineDynamicImports: true, 
    //   }
    // }
  },
  optimizeDeps: {
    // exclude: ['argon2-browser'], // <--- 移除 argon2-browser 的排除
  },
  build: {
    target: "esnext",
  },
  server: { // server.fs.allow 通常不需要，除非有特定场景
    // fs: {
    //   allow: ['../../node_modules', '.'] 
    // }
  }
});

