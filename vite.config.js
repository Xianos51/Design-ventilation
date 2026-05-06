import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Pour GitHub Pages
    base: process.env.NODE_ENV === 'production' ? '/Design-ventilation/' : '/'
  },
  server: {
    port: 3000,
    open: true
  }
});
