import { resolve, extname } from 'path';
import { cpSync, existsSync, readFileSync } from 'fs';
import { defineConfig } from 'vite';

const HTML_PAGES = [
  'index',
  'login',
  'signup',
  'dashboard',
  'doctor',
  'hospital',
  'medications',
  'profile',
  'records',
  'upload',
  'timeline',
  'inventory',
  'ai-companion',
  'delegation',
  'tests',
  '404',
];

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    // Clean URL routing & custom 404 fallback middleware for dev server
    {
      name: 'clean-url-routing-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url ? req.url.split('?')[0] : '/';
          
          // Ignore Vite internals, static assets, and backend proxies
          if (
            rawUrl.startsWith('/@') ||
            rawUrl.startsWith('/api') ||
            rawUrl.startsWith('/uploads') ||
            rawUrl.startsWith('/node_modules') ||
            extname(rawUrl) !== ''
          ) {
            return next();
          }

          const trimmed = rawUrl.replace(/^\/+|\/+$/g, '');

          // Root route
          if (!trimmed) {
            req.url = '/index.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
            return next();
          }

          // Exact page match without .html
          if (HTML_PAGES.includes(trimmed)) {
            req.url = `/${trimmed}.html` + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
            return next();
          }

          // Unknown route -> serve 404.html
          req.url = '/404.html';
          res.statusCode = 404;
          return next();
        });
      },
    },
    // Copy static JS bundles during production build
    {
      name: 'copy-js-assets',
      closeBundle() {
        const jsDir = resolve(__dirname, 'js');
        const distJsDir = resolve(__dirname, 'dist/js');
        if (existsSync(jsDir)) {
          cpSync(jsDir, distJsDir, { recursive: true, force: true });
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        doctor: resolve(__dirname, 'doctor.html'),
        hospital: resolve(__dirname, 'hospital.html'),
        medications: resolve(__dirname, 'medications.html'),
        profile: resolve(__dirname, 'profile.html'),
        records: resolve(__dirname, 'records.html'),
        upload: resolve(__dirname, 'upload.html'),
        timeline: resolve(__dirname, 'timeline.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        aiCompanion: resolve(__dirname, 'ai-companion.html'),
        delegation: resolve(__dirname, 'delegation.html'),
        tests: resolve(__dirname, 'tests.html'),
        notFound: resolve(__dirname, '404.html'),
      },
    },
  },
});
