import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import path from 'path';

// Dev-only middleware that mocks the /api/geo Vercel function locally so
// `npm run dev` matches production behavior. Production uses api/geo.ts.
//
// There is no x-vercel-ip-country header in dev, so this looks up the dev
// machine's own IP — correct locally, since the machine running the dev server
// is the visitor. Set GEO_COUNTRY to force a result and test either path
// without a VPN, e.g. `GEO_COUNTRY=US npm run dev`.
const devGeoApi = (): Plugin => ({
  name: 'dev-geo-api',
  configureServer(server) {
    server.middlewares.use('/api/geo', async (_req, res) => {
      const send = (country: string | null) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ country }));
      };

      // Read through globalThis: this project has no @types/node, so a bare
      // `process` reference does not typecheck under tsconfig.node.json.
      const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env;
      const override = env?.GEO_COUNTRY;
      if (override) {
        send(override);
        return;
      }

      try {
        const upstream = await fetch('https://api.country.is/');
        const data = await upstream.json();
        send(data?.country ?? null);
      } catch {
        send(null);
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