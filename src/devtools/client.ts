// WebSocket client to sync with assist server
import { bus } from './bus';
import { commands } from './commands';

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;

function getAssistUrl(port: number) {
  const override = import.meta.env.VITE_ASSIST_URL;
  if (override && typeof override === 'string') return override;

  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  const url = `${proto}://${host}:${port}`;
  if (import.meta.env.VITE_ASSIST_TOKEN) {
    return `${url}?token=${import.meta.env.VITE_ASSIST_TOKEN}`;
  }
  return url;
}

export let isConnected = false;
const statusListeners: Set<(connected: boolean) => void> = new Set();

export function onConnectionChange(callback: (connected: boolean) => void) {
  statusListeners.add(callback);
  callback(isConnected);
  return () => statusListeners.delete(callback);
}

function setConnected(connected: boolean) {
  if (isConnected === connected) return;
  isConnected = connected;
  statusListeners.forEach((cb) => cb(connected));
}

export function connectAssist(port = 3001) {
  if (ws?.readyState === WebSocket.OPEN) return;

  try {
    ws = new WebSocket(getAssistUrl(port));

    ws.onopen = () => {
      console.log('[assist] Connected to assist server');
      setConnected(true);
      // Send initial context
      syncContext();
      syncCommands();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'execute') {
          // Execute command from remote
          commands.execute(msg.command, msg.payload).then(
            (result) => {
              ws?.send(
                JSON.stringify({
                  v: 1,
                  type: 'executeResult',
                  requestId: msg.requestId,
                  result,
                }),
              );
            },
            (error) => {
              ws?.send(
                JSON.stringify({
                  v: 1,
                  type: 'executeResult',
                  requestId: msg.requestId,
                  result: { success: false, error: String(error) },
                }),
              );
            },
          );
        }
      } catch (e) {
        console.error('[assist] Message parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[assist] Disconnected, reconnecting in 5s...');
      setConnected(false);
      ws = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => connectAssist(port), 5000);
    };

    ws.onerror = () => {
      ws?.close();
      setConnected(false);
    };
  } catch {
    console.log('[assist] Could not connect to assist server');
  }
}

function syncContext() {
  if (ws?.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    v: 1,
    type: 'context',
    data: bus.getContext(),
  }));
}

function syncCommands() {
  if (ws?.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    v: 1,
    type: 'commands',
    data: commands.list(),
  }));
}

// Sync context on every event (throttled)
let syncTimer: number | null = null;
bus.subscribe(() => {
  if (syncTimer) return;
  syncTimer = window.setTimeout(() => {
    syncContext();
    syncTimer = null;
  }, 500);
});

// Also stream individual events
bus.subscribe((event) => {
  if (ws?.readyState === WebSocket.OPEN) {
    // If registry changes, sync full commands list
    if (event.type === 'registry') {
      syncCommands();
    }
    // Stream event (including registry event if desired, though syncCommands handles payload)
    ws.send(JSON.stringify({ v: 1, type: 'event', data: event }));
  }
});
