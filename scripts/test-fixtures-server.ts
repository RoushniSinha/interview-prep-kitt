import http from 'http';

export function createFixtureServer(port = 8099): http.Server {
  const server = http.createServer((req, res) => {
    const url = req.url || '/';

    if (url === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`User-agent: *\nDisallow: /private/\nAllow: /\n`);
      return;
    }

    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Nexus Cloud Platform</title></head>
<body>
  <header><h1>Welcome to Nexus Cloud</h1></header>
  <p>Nexus is the next generation autonomous serverless computing platform.</p>
  <a href="/about-us">About Our Mission</a>
  <a href="/engineering-handbook">Engineering Handbook & Culture</a>
  <a href="/how-we-hire">Our Engineering Interview Process</a>
</body>
</html>`);
      return;
    }

    if (url === '/about-us') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>About Nexus</title></head>
<body>
  <h1>About Us</h1>
  <p>Nexus builds cloud orchestration systems used by over 50,000 developers worldwide. We value high velocity and psychological safety.</p>
</body>
</html>`);
      return;
    }

    if (url === '/engineering-handbook') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Nexus Engineering Handbook</title></head>
<body>
  <h1>Engineering Principles</h1>
  <p>We write TypeScript, Go, and Rust. All engineers rotate on-call and practice trunk-based development with rigorous automated tests.</p>
</body>
</html>`);
      return;
    }

    if (url === '/how-we-hire') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>How We Hire Engineers at Nexus</title></head>
<body>
  <h1>Our Hiring Process</h1>
  <p>Our interview process consists of:
     1. Recruiter Screen (30m)
     2. Technical & Architecture Round (60m) - live system design
     3. Culture & Team Values Round (45m)
     We value real code over theoretical whiteboard puzzles.</p>
</body>
</html>`);
      return;
    }

    if (url === '/no-hiring-site') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Minimal Widget Co</title></head>
<body>
  <h1>We make widgets.</h1>
  <p>Contact sales for pricing.</p>
</body>
</html>`);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('test-fixtures-server.ts')) {
  const server = createFixtureServer(8099);
  server.listen(8099, '127.0.0.1', () => {
    console.log('[FixtureServer] Listening on http://127.0.0.1:8099');
  });
}
