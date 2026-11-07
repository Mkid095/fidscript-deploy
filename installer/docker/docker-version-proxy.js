const http = require('http');

const SOCK_PATH = '/var/run/docker.sock';
const PORT = 2375;
const API_VER = '1.41';

const server = http.createServer((clientReq, clientRes) => {
  const newUrl = clientReq.url.replace(/^\/v\d+\.\d+\//, `/v${API_VER}/`) || `/v${API_VER}/`;
  
  const proxyReq = http.request({
    method: clientReq.method,
    path: newUrl,
    headers: { ...clientReq.headers, host: 'localhost' },
    socketPath: SOCK_PATH,
  }, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });
  
  proxyReq.on('error', (e) => {
    if (!clientRes.headersSent) clientRes.writeHead(502);
    clientRes.end(JSON.stringify({ error: e.message }));
  });
  
  clientReq.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => console.log(`Docker API proxy on :${PORT} → v${API_VER}`));
