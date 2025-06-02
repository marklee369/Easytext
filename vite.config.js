// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    topLevelAwait()
  ],
  worker: {
    format: 'es', // 确保 worker 输出为 ES 模块
    plugins: () => [ // 确保插件应用于 worker 构建
      wasm(),
      topLevelAwait()
    ],
    // 尝试为 Rollup 的 worker 输出配置添加选项
    rollupOptions: {
      output: {
        // 确保 worker 内部的动态导入和 import.meta.url 能正确工作
        // Vite 默认情况下应该能处理好，但有时需要明确
        inlineDynamicImports: true, // 如果 worker 内部有动态 import()
      }
    }
  },
  optimizeDeps: {
    exclude: ['argon2-browser'],
    // 对于 WebAssembly，有时需要确保 Vite 不会尝试处理 Wasm 文件本身
    // 或者确保其依赖的 JS 包装器被正确处理。
    // `vite-plugin-wasm` 应该处理 .wasm 文件。
  },
  build: {
    target: "esnext", // 确保构建目标支持现代JS特性
    rollupOptions: {
      // 这里的 external 主要是针对主构建，不是 worker 内部
      // external: [], // 通常不需要将 argon2.wasm 设为 external
      output: {
        // 如果 worker 脚本本身也需要被特殊处理（例如，如果它不是通过 new URL() 加载的）
        // 但我们是通过 new URL() 加载的，所以 Vite 应该会自动处理 worker 的打包
      }
    }
  },
  // 新增或调整 server 配置，确保开发环境与构建环境行为一致
  server: {
    fs: {
      // 允许访问 node_modules 中的文件，有时 Wasm 库需要
      allow: ['../../node_modules', '.'] // 允许访问项目根目录和上一级的 node_modules
    }
  }
});

