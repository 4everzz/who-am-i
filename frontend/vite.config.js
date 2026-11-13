import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  publicDir: '.legacy-public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        home: 'index.html',
        notes: 'notes.html',
        skills: 'skills-principles.html',
        works: 'works.html',
        about: 'about.html',
      },
    },
  },
});
