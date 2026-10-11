import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import {
  floodsightApiPlugin,
  createFloodsightMiddleware,
  VERIFIED_REGISTRY,
  VerificationRecord,
  ConnectMiddleware
} from './src/server/floodsightMiddleware';

export {
  floodsightApiPlugin,
  createFloodsightMiddleware,
  VERIFIED_REGISTRY
};

export type {
  VerificationRecord,
  ConnectMiddleware
};

export default defineConfig({
  plugins: [react(), tailwindcss(), floodsightApiPlugin(__dirname)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '/OrbitalEarth3D.tsx': path.resolve(__dirname, './src/components/3d/OrbitalEarth3D.tsx'),
      '/TopographicTerrain3D.tsx': path.resolve(__dirname, './src/components/3d/TopographicTerrain3D.tsx'),
      '/geoTiffGenerator.ts': path.resolve(__dirname, './src/utils/geoTiffGenerator.ts'),
    },
  },
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
    ),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});
