import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { defineConfig, UserConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  const plugins: UserConfig['plugins'] = [
    react(),
    isLib && dts({
      tsconfigPath: path.resolve(import.meta.dirname, 'tsconfig.lib.json'),
      logLevel: 'error',
    }),
  ].filter(Boolean)

  return {
    plugins,
    resolve: {
      // npm link 的包会从自己项目的 node_modules 解析 react,导致出现两份 React,统一去重到工程根目录的副本
      dedupe: ['react', 'react-dom'],
    },
    build: isLib
      ? {
          lib: {
            entry: path.resolve(import.meta.dirname, 'src/index.ts'),
            name: 'index',
            formats: ['es', 'cjs'],
            fileName: format => `index.${format === 'es' ? 'js' : 'cjs'}`,
          },
          rollupOptions: {
            external: [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'antd',
              '@ant-design/icons',
              'codemirror',
              '@codemirror/view',
              '@codemirror/state',
              '@codemirror/commands',
              '@codemirror/language',
              '@codemirror/highlight',
              '@codemirror/lang-markdown',
              '@codemirror/theme-one-dark',
              '@lezer/common',
              '@lezer/highlight',
              'highlight.js',
              'remons-markdown-plugins',
              'remons-markdown-plugins/style.css',
              'remons-render-markdown',
              'remons-render-markdown/dist/index.css',
            ],
            output: {
              chunkFileNames: 'assets/[name].[hash].js',
              assetFileNames: assetInfo => {
                if (assetInfo.name.endsWith('.css')) return 'index.css'
                return 'assets/[name].[hash][extname]'
              },
            },
            treeshake: true,
          },
          cssCodeSplit: false,
          cssTarget: ['es2018'],
          sourcemap: true,
          minify: false,
          emptyOutDir: true,
        }
      : undefined,
    publicDir: isLib ? false : 'public',
    css: {
      modules: {
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
    },
  }
})
