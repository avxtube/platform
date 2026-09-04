import http from 'http';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({
  ws: true // รองรับ WebSocket สำหรับ Next.js Hot Reload
});

// กำหนดว่า Domain ไหน จะชี้ไปที่ Port อะไร
const routes = {
  'avxtube.org': 'http://127.0.0.1:3000',        // web
  'admin.avxtube.org': 'http://127.0.0.1:3001', // admin
  'api.avxtube.org': 'http://127.0.0.1:4000', // api
  'cdn.avxtube.org': 'http://127.0.0.1:8082',        // cdn
  'static.avxtube.org': 'http://127.0.0.1:8082', // static
  'playlist.avxtube.org': 'http://127.0.0.1:8082', // playlist
  // 'vidu.local': 'http://127.0.0.1:5000',
  // 'admin.vidu.local': 'http://127.0.0.1:5001',
  // 'studio.vidu.local': 'http://127.0.0.1:5002',
  // 'id.vidu.local': 'http://127.0.0.1:5003',
};

const server = http.createServer((req, res) => {
  const host = req.headers.host;
  const target = routes[host];

  if (target) {
    proxy.web(req, res, { target }, (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Bad Gateway: ${err.message}`);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Proxy Route Not Found: ' + host);
  }
});

// รองรับการ Upgrade Connection สำหรับ WebSocket
server.on('upgrade', (req, socket, head) => {
  const host = req.headers.host;
  const target = routes[host];
  if (target) {
    proxy.ws(req, socket, head, { target }, (err) => {
      socket.end();
    });
  }
});

server.listen(80, () => {
  console.log('✅ Reverse Proxy is running on port 80');
  console.log('Proxy Routes:');
  Object.keys(routes).forEach(domain => {
    console.log(`- http://${domain} -> ${routes[domain]}`);
  });
});
