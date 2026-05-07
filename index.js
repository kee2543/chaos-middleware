require('dotenv').config();
const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy');
const cors = require('cors');
const chalk = require('chalk');

const app = express();
const path = require('path');
app.use(cors());
app.use(express.json());

// Serve Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

const PORT = process.env.PORT || 4000;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5000';

// Initial Configuration
let config = {
  enabled: true,
  latency: { min: 100, max: 1000 },
  failureRate: 0.1,
  dropRate: 0.05,
  packetLoss: 0.1
};

// Metrics
let metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  droppedRequests: 0,
  latencyApplied: 0
};

// Create Proxy Server
const proxy = httpProxy.createProxyServer({
  target: TARGET_URL,
  ws: true
});

// Proxy Error Handling
proxy.on('error', (err, req, res) => {
  console.error(chalk.red('[Proxy Error]'), err.message);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy Error', message: err.message }));
  }
});

// Chaos Logic Helpers
const shouldTrigger = (rate) => Math.random() < rate;
const getRandomLatency = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Middleware to inject chaos
const chaosMiddleware = async (req, res, next) => {
  if (!config.enabled) return next();

  metrics.totalRequests++;

  // 1. Drop Request
  if (shouldTrigger(config.dropRate)) {
    metrics.droppedRequests++;
    console.log(chalk.bgRed.white(' [DROP] '), chalk.gray(`${req.method} ${req.url}`));
    return req.destroy(); // Simulates a hard drop/timeout
  }

  // 2. Failure Injection
  if (shouldTrigger(config.failureRate)) {
    metrics.failedRequests++;
    console.log(chalk.red(' [FAIL] '), chalk.gray(`${req.method} ${req.url}`));
    return res.status(500).json({
      error: 'Chaos Injection',
      message: 'Random failure triggered by Chaos Middleware'
    });
  }

  // 3. Latency Injection
  const delay = getRandomLatency(config.latency.min, config.latency.max);
  if (delay > 0) {
    metrics.latencyApplied++;
    console.log(chalk.yellow(` [DELAY] `), chalk.gray(`${delay}ms for ${req.method} ${req.url}`));
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  next();
};

// Config API
app.get('/admin/config', (req, res) => res.json(config));
app.post('/admin/config', (req, res) => {
  config = { ...config, ...req.body };
  console.log(chalk.green(' [CONFIG] '), 'Updated configuration:', config);
  res.json({ message: 'Configuration updated', config });
});

// Metrics API
app.get('/admin/metrics', (req, res) => res.json(metrics));

// All other requests go through chaos and then to proxy
app.use(chaosMiddleware);

app.use((req, res) => {
  console.log(chalk.blue(' [FORWARD] '), chalk.gray(`${req.method} ${req.url}`));
  proxy.web(req, res);
});

// Handle WebSockets
const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  if (config.enabled && shouldTrigger(config.packetLoss)) {
    console.log(chalk.magenta(' [WS-DROP] '), 'Dropped WebSocket connection attempt');
    return socket.destroy();
  }
  
  console.log(chalk.blue(' [WS-UPGRADE] '), 'Forwarding WebSocket connection');
  proxy.ws(req, socket, head);
});

server.listen(PORT, () => {
  console.log(chalk.cyan('╔════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                            ║'));
  console.log(chalk.cyan('║        💥 CHAOS MIDDLEWARE ACTIVE 💥        ║'));
  console.log(chalk.cyan('║                                            ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════╝'));
  console.log(chalk.white(` Listening on: `), chalk.bold.green(`http://localhost:${PORT}`));
  console.log(chalk.white(` Proxying to:  `), chalk.bold.yellow(TARGET_URL));
  console.log(chalk.white(` Admin Config: `), chalk.bold.blue(`http://localhost:${PORT}/admin/config`));
  console.log(chalk.cyan('──────────────────────────────────────────────'));
});
