import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/Design-ventilation/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  }
});
