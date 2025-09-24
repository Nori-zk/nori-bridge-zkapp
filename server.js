import express from 'express';
import path from 'path';
import http from 'http';

const app = express();
const port = 8090;

// Serve static files from /out with COOP/COEP/CORP + no caching
app.use(express.static(path.resolve('out'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin'); // required for workers - check its probably not needed....

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

// Fallback for index.html (important for SPA routing)
app.get(/.*/, (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  res.sendFile(path.resolve('out/index.html'));
});

// Create HTTP server
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});
