import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import path from 'path';

// Dev-only middleware that mocks the /api/geo Vercel function locally so
// `npm run dev` matches production behavior. Production uses api/geo.ts.
const devGeoApi = (): Plugin => ({
  name: 'dev-geo-api',
  configureServer(server) {
    server.middlewares.use('/api/geo', async (_req, res) => {
      try {
        const upstream = await fetch('https://api.country.is/');
        const data = await upstream.json();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ country: data?.country ?? null }));
      } catch {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ country: null }));
      }
    });
  },
});

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    devGeoApi(),
  ],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  define: {
    global: 'window',
    'process.env': JSON.stringify({}),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      process: 'process/browser',
      global: 'global',
    },
  },
});