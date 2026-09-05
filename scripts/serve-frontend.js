// Frontend dev server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FRONTEND_PORT || 3000;
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Safe path resolution
  const urlPath = req.url.split('?')[0];
  let safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(FRONTEND_DIR, safePath);

  // If path without extension exists with .html, append it
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  // Check if target is directory -> check index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;"><h2>404 Not Found</h2><p>The requested path <code>${urlPath}</code> was not found on MediLocker frontend.</p><p><a href="/">Go to Home</a></p></body></html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[32m[FRONTEND]\x1b[0m 🌐 MediLocker Frontend dev server running:`);
  console.log(`\x1b[32m[FRONTEND]\x1b[0m 👉 http://localhost:${PORT}`);
  console.log(`\x1b[32m[FRONTEND]\x1b[0m 📋 Dashboard: http://localhost:${PORT}/dashboard.html`);
});
