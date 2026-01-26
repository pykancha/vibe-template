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
const pendingRequests = new Map();

function isOpen(client) {
  return client.readyState === 1;
}

function sendJson(client, payload) {
  if (!isOpen(client)) return;
  client.send(JSON.stringify(payload));
}

wss.on('connection', (ws) => {
  console.log('[assist] Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'context') {
        latestContext = msg.data;
        appClients.add(ws);
        return;
      }

      if (msg.type === 'commands') {
        commandsList = msg.data;
        appClients.add(ws);
        return;
      }

      if (msg.type === 'event') {
        wss.clients.forEach((client) => {
          if (client !== ws) sendJson(client, msg);
        });
        return;
      }

      if (msg.type === 'execute') {
        pendingRequests.set(msg.requestId, ws);

        let sent = false;
        wss.clients.forEach((client) => {
          if (!appClients.has(client)) return;
          sendJson(client, {
            type: 'execute',
            command: msg.command,
            payload: msg.payload,
            requestId: msg.requestId,
          });
          sent = true;
        });

        if (!sent) {
          pendingRequests.delete(msg.requestId);
          sendJson(ws, {
            type: 'executeResult',
            requestId: msg.requestId,
            result: { ok: false, error: 'No app client connected to execute commands' },
          });
        }

        return;
      }

      if (msg.type === 'executeResult') {
        const requester = pendingRequests.get(msg.requestId);
        if (requester) {
          pendingRequests.delete(msg.requestId);
          sendJson(requester, msg);
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

    for (const [requestId, requester] of pendingRequests.entries()) {
      if (requester === ws) pendingRequests.delete(requestId);
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
