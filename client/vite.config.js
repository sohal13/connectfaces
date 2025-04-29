import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  define: {
    global: 'window', // Polyfill global for the browser
  },
  erver: {
    hmr: {
      overlay: false, // Disable HMR overlay
    },
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
})
