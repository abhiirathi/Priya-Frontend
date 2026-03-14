import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/// <reference types="vite/client" />

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          csv: ['papaparse']
        }
      }
    }
  }
});
