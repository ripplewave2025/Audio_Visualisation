import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  // Do NOT put .glsl in assetsInclude — that returns a URL string instead of
  // shader source and the canvas goes black (9:16 frame only).
  plugins: [
    glsl({
      include: ['**/*.glsl'],
      defaultExtension: 'glsl',
      warnDuplicatedImports: true,
      compress: true,
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
