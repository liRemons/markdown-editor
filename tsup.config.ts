import { defineConfig } from 'tsup'
import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const less = require('less')

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  tsconfig: 'tsconfig.lib.json',
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: [
    'react',
    'react-dom',
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
    'markdown-it',
    'highlight.js',
    'remons-markdown-plugins',
    'remons-markdown-plugins/style.css',
    'remons-render-markdown',
    'remons-render-markdown/dist/index.css',
  ],
  bundle: true,
  noExternal: [],
  css: true,
  injectStyle: false,
  outDir: 'dist',
  esbuildOptions(options) {
    options.outbase = 'src'
  },
  esbuildPlugins: [
    {
      name: 'less-plugin',
      setup(build) {
        build.onLoad({ filter: /\.less$/, namespace: 'file' }, async (args: any) => {
          const fileContent = fs.readFileSync(args.path, 'utf8')
          const result = await less.render(fileContent, {
            paths: [args.directory],
            filename: args.path,
          })
          return {
            contents: result.css,
            loader: 'css',
          }
        })
      },
    },
  ],
})
