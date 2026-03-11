import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // GitHub Pages / GitLab Pages にデプロイする場合は
  // リポジトリ名をベースパスに設定する
  // base: '/mannen-dokei/',
  base: '/mannen-clock/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
        },
      },
    },
  },
})
