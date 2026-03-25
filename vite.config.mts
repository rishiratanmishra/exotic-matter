import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'src-electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['node-pty', 'electron'],
              output: {
                entryFileNames: '[name].js',
                format: 'cjs',
              },
            },
          },
        },
      },
      {
        entry: 'src-electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              external: ['node-pty', 'electron'],
              output: {
                entryFileNames: '[name].js',
                format: 'cjs',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Monaco into its own chunk (~4MB) to speed up initial load
          'monaco-editor': ['monaco-editor'],
          // Separate React + Antd into vendor chunk
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    // Increase chunk warning threshold for known-large deps like Monaco
    chunkSizeWarningLimit: 5000,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Pre-bundle Monaco to avoid slow startup in dev
    include: ['monaco-editor'],
  },
})
