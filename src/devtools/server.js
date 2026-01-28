#!/usr/bin/env node
// WebSocket server for AI agent introspection
// Run with: node src/devtools/server.js

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.ASSIST_PORT || 3001;
const HOST = process.env.ASSIST_HOST || '127.0.0.1';
const TOKEN = process.env.VIBE_ASSIST_TOKEN;
const EXECUTION_TIMEOUT = parseInt(process.env.ASSIST_EXECUTION_TIMEOUT || '15000', 10);

if (HOST !== '127.0.0.1' && HOST !== 'localhost' && !TOKEN) {
  console.error(`[assist] ERROR: VIBE_ASSIST_TOKEN is required when binding to non-localhost (${HOST})`);
  process.exit(1);
}

function checkAuth(req) {
  if (!TOKEN) return true;
  // req.url is relative, so we use a dummy base
  const url = new URL(req.url, 'http://localhost');
  const queryToken = url.searchParams.get('token');
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  return queryToken === TOKEN || headerToken === TOKEN;
}

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!checkAuth(req)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size }));
    return;
  }

  if (pathname === '/context') {
    // Return the latest context from connected clients
    res.writeHead(200);
    res.end(JSON.stringify(latestContext));
    return;
  }

  if (pathname === '/commands') {
    res.writeHead(200);
    res.end(JSON.stringify(commandsList));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server: httpServer });

let latestContext = { logs: [], lastError: null, lastState: null, recentNetwork: [], timestamp: 0 };
let commandsList = [];

const appClients = new Set();
const appClientLastSeen = new Map();
const pendingRequests = new Map();

function isOpen(client) {
  return client.readyState === 1;
}

function sendJson(client, payload) {
  if (!isOpen(client)) return;
  // Always attach protocol version to outgoing messages
  if (!payload.v) payload.v = 1;
  client.send(JSON.stringify(payload));
}

function markAppClientActive(ws) {
  appClients.add(ws);
  appClientLastSeen.set(ws, Date.now());
}

function getActiveAppClient() {
  let bestClient = null;
  let bestSeen = -1;

  for (const client of appClients) {
    if (!isOpen(client)) continue;
    const seen = appClientLastSeen.get(client) ?? 0;
    if (seen > bestSeen) {
      bestSeen = seen;
      bestClient = client;
    }
  }

  return bestClient;
}

function clearPendingRequest(requestId) {
  const entry = pendingRequests.get(requestId);
  if (!entry) return;
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  pendingRequests.delete(requestId);
}

wss.on('connection', (ws, req) => {
  if (!checkAuth(req)) {
    console.log('[assist] Connection rejected: Unauthorized');
    ws.close(1008, 'Unauthorized');
    return;
  }

  console.log('[assist] Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Add protocol version if missing for future compat
      if (!msg.v) msg.v = 1;

      if (msg.type === 'context') {
        latestContext = msg.data;
        markAppClientActive(ws);
        return;
      }

      if (msg.type === 'commands') {
        commandsList = msg.data;
        markAppClientActive(ws);
        return;
      }

      if (msg.type === 'event') {
        wss.clients.forEach((client) => {
          if (client !== ws) sendJson(client, msg);
        });
        return;
      }

      if (msg.type === 'execute') {
        const requestId = msg.requestId;
        const requester = ws;

        const activeClient = getActiveAppClient();
        if (!activeClient) {
          sendJson(requester, {
            type: 'executeResult',
            requestId,
            result: { success: false, error: 'No app client connected to execute commands' },
          });
          return;
        }

        const timeoutId = setTimeout(() => {
          clearPendingRequest(requestId);
          sendJson(requester, {
            type: 'executeResult',
            requestId,
            result: { success: false, error: 'Command timed out waiting for executeResult' },
          });
        }, EXECUTION_TIMEOUT);

        pendingRequests.set(requestId, { requester, timeoutId });

        sendJson(activeClient, {
          type: 'execute',
          command: msg.command,
          payload: msg.payload,
          requestId,
        });

        return;
      }

      if (msg.type === 'executeResult') {
        const entry = pendingRequests.get(msg.requestId);
        if (entry?.requester) {
          clearPendingRequest(msg.requestId);
          sendJson(entry.requester, msg);
        }
        return;
      }
    } catch (e) {
      console.error('[assist] Parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log('[assist] Client disconnected');
    appClients.delete(ws);
    appClientLastSeen.delete(ws);

    for (const [requestId, entry] of pendingRequests.entries()) {
      if (entry?.requester === ws) {
        clearPendingRequest(requestId);
      }
    }
  });

  sendJson(ws, { type: 'connected', timestamp: Date.now() });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[assist] Server running on http://${HOST}:${PORT}`);
  console.log(`[assist] WebSocket on ws://${HOST}:${PORT}`);
  console.log(`[assist] Endpoints:`);
  console.log(`  GET /health   - Server health`);
  console.log(`  GET /context  - Latest app context`);
  console.log(`  GET /commands - Available commands`);
});
