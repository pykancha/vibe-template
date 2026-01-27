#!/usr/bin/env node
// WebSocket server for AI agent introspection
// Run with: node src/devtools/server.js

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.ASSIST_PORT || 3001;

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size }));
    return;
  }

  if (req.url === '/context') {
    // Return the latest context from connected clients
    res.writeHead(200);
    res.end(JSON.stringify(latestContext));
    return;
  }

  if (req.url === '/commands') {
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

wss.on('connection', (ws) => {
  console.log('[assist] Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

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
            result: { ok: false, error: 'No app client connected to execute commands' },
          });
          return;
        }

        const timeoutId = setTimeout(() => {
          clearPendingRequest(requestId);
          sendJson(requester, {
            type: 'executeResult',
            requestId,
            result: { ok: false, error: 'Command timed out waiting for executeResult' },
          });
        }, 15_000);

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

httpServer.listen(PORT, () => {
  console.log(`[assist] Server running on http://localhost:${PORT}`);
  console.log(`[assist] WebSocket on ws://localhost:${PORT}`);
  console.log(`[assist] Endpoints:`);
  console.log(`  GET /health   - Server health`);
  console.log(`  GET /context  - Latest app context`);
  console.log(`  GET /commands - Available commands`);
});
