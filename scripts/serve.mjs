// Test helper: serves dist/ under /bare-bones-kiro/ on 127.0.0.1, the way GitHub Pages serves the site.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PREFIX = '/bare-bones-kiro/';
const dist = fileURLToPath(new URL('../dist', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

if (!existsSync(dist)) {
  console.error('dist/ not found: run npm run build');
  process.exit(1);
}

const server = createServer((request, response) => {
  const reply = (status, headers = {}, body = '') => {
    response.writeHead(status, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, { Allow: 'GET, HEAD' });

  const pathname = (request.url ?? '/').split(/[?#]/)[0] ?? '/';
  if (pathname === PREFIX.slice(0, -1)) return reply(301, { Location: PREFIX });
  if (!pathname.startsWith(PREFIX)) return reply(404, {}, 'not found');

  let relative;
  try {
    relative = decodeURIComponent(pathname.slice(PREFIX.length));
  } catch {
    return reply(404, {}, 'not found');
  }
  let file = path.resolve(dist, relative);
  if (file !== dist && !file.startsWith(dist + path.sep)) return reply(404, {}, 'not found');
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) return reply(404, {}, 'not found');
  reply(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' }, readFileSync(file));
});

server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1');
