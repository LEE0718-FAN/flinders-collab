import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('date-fns')) {
            return 'vendor-dates';
          }
          if (id.includes('@supabase') || id.includes('socket.io-client')) {
            return 'vendor-services';
          }
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'vendor-maps';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
