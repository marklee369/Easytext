// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await"; // 保持这个，以防万一

export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    topLevelAwait() // 确保顶层 await 被处理
  ],
  // 关键：确保 Worker 构建也使用这些插件
  worker: {
    format: 'es', // 确保 worker 输出为 ES 模块，这对于现代 Wasm 集成很重要
    plugins: () => [ // 使用函数返回插件数组，确保每次 worker 构建时都应用
      wasm(),
      topLevelAwait()
    ]
  },
  optimizeDeps: {
    // 尝试从预构建中排除 argon2-browser，让 Vite 在运行时处理它
    // 这有时可以解决与 CJS/ESM 混合或 Wasm 依赖相关的问题
    exclude: ['argon2-browser'],
    // 如果 argon2-browser 内部的某些部分确实是 CJS 并且导致问题，
    // 你可能需要明确包含它们，但这通常是后备方案。
    // include: ['argon2-browser > some-cjs-dependency'] 
  },
  build: {
    target: "esnext", // 确保构建目标支持现代JS特性
    // 如果遇到 "Could not resolve "..." (esm-bundler) in "..." " 错误，
    // 确保 rollupOptions 中没有不正确的配置
  }
});

