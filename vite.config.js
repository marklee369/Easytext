// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from "vite-plugin-wasm"; // <--- 1. 导入插件
// import topLevelAwait from "vite-plugin-top-level-await"; // <--- 2. (可选) 如果Wasm模块需要顶层await

export default defineConfig({
  plugins: [
    vue(),
    wasm(), // <--- 3. 使用插件
    // topLevelAwait() // <--- 4. (可选) 如果需要，也使用这个插件
  ],
  // 可选: 如果 Worker 内部也需要处理 Wasm 并且遇到问题，
  // 可能需要为 Worker 配置特定的构建选项，但这通常由 wasm() 插件处理。
  // worker: {
  //   plugins: [
  //     wasm(),
  //     topLevelAwait()
  //   ]
  // }
  // 另一个需要注意的点是，Vite 默认会尝试将 worker 打包成 IIFE 格式。
  // 如果你的 worker 或其依赖 (如 argon2-browser 内部的 wasm 加载) 依赖 ESM 格式，
  // 你可能需要配置 worker 的 format。
  // worker: {
  //   format: 'es' // 确保 worker 也输出为 ES 模块
  // }
  // 结合起来可能是:
  // worker: {
  //   format: 'es',
  //   plugins: [
  //     wasm(),
  //     topLevelAwait()
  //   ]
  // }

  // 优化选项，确保Vite能正确处理Wasm依赖
  optimizeDeps: {
    exclude: ['argon2-browser'], // 尝试将 argon2-browser 从预构建中排除
    // 如果上面的 exclude 不起作用，或者 argon2-browser 内部的 wasm 仍然有问题，
    // 有时需要更明确地告诉 Vite 某些包是 CJS 格式（如果它们是的话）
    // include: ['argon2-browser > @giraud/argon2-wasm-bindgen-browser'], // 这是一个猜测，具体路径可能不同
  },
  build: {
    target: "esnext", // 确保构建目标支持现代JS特性，包括顶层await（如果使用）
  }
});

