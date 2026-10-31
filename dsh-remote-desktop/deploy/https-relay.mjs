import http from 'node:http';
import { pathToFileURL } from 'node:url';

// This listener is only for a local cloudflared process. Authentication remains
// the responsibility of the DSH owner-cookie gate; Host and Origin stay intact.
export function createRelay({ publicHost, upstreamPort }) {
  if (!/^[a-z0-9.-]+$/.test(publicHost) || !Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65535) throw new Error('invalid relay configuration');
  const peers = new Set();
  const allowed = req => req.headers.host === publicHost && req.headers['x-forwarded-proto'] === 'https';
  const securedHeaders = input => {
    const headers = { ...input, 'strict-transport-security': 'max-age=31536000', 'referrer-policy': 'no-referrer' };
    if (headers['set-cookie']) headers['set-cookie'] = [].concat(headers['set-cookie']).map(cookie => /;\s*secure(?:;|$)/i.test(cookie) ? cookie : `${cookie}; Secure`);
    return headers;
  };
  const options = req => ({ host: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers: req.headers });
  const server = http.createServer({ maxHeaderSize: 16384 }, (req, res) => {
    if (!allowed(req)) { res.writeHead(403, { 'cache-control': 'no-store' }); res.end('HTTPS required'); return; }
    const upstream = http.request(options(req), reply => {
      reply.on('aborted', () => res.destroy());
      reply.on('error', () => res.destroy());
      if (res.destroyed) { reply.destroy(); return; }
      res.writeHead(reply.statusCode, securedHeaders(reply.headers)); reply.pipe(res);
    });
    upstream.on('error', () => {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(502, { 'cache-control': 'no-store' }); res.end();
    });
    res.on('close', () => upstream.destroy());
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  });
  server.on('connection', socket => { peers.add(socket); socket.on('close', () => peers.delete(socket)); });
  server.on('upgrade', (req, socket, head) => {
    if (!allowed(req)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); return; }
    const request = http.request(options(req));
    request.on('upgrade', (reply, upstream, upstreamHead) => {
      peers.add(upstream); upstream.on('close', () => peers.delete(upstream));
      let response = 'HTTP/1.1 101 Switching Protocols\r\n';
      for (const [name, value] of Object.entries(securedHeaders(reply.headers))) for (const item of [].concat(value ?? [])) response += `${name}: ${item}\r\n`;
      socket.write(response + '\r\n');
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) upstream.write(head);
      socket.on('error', () => upstream.destroy()); upstream.on('error', () => socket.destroy());
      socket.on('close', () => upstream.destroy()); upstream.on('close', () => socket.destroy());
      upstream.pipe(socket); socket.pipe(upstream);
    });
    request.on('response', reply => { reply.resume(); socket.end(`HTTP/1.1 ${reply.statusCode} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); });
    request.on('error', () => socket.destroy());
    socket.on('close', () => request.destroy()); request.end();
  });
  return { server, close: () => { for (const peer of peers) peer.destroy(); return new Promise(resolve => server.close(resolve)); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const publicHost = process.env.DSH_PUBLIC_HOST;
  const upstreamPort = Number(process.env.DSH_UPSTREAM_PORT || 18326);
  const port = Number(process.env.DSH_RELAY_PORT || 18325);
  const relay = createRelay({ publicHost, upstreamPort });
  relay.server.listen(port, '127.0.0.1');
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => relay.close().then(() => process.exit(0)));
}
