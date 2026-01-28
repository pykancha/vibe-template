
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

// @vitest-environment node

const SERVER_PATH = path.resolve(__dirname, 'server.js');
const BASE_PORT = 3005;

// Helper to wait for socket to open
const waitForOpen = (ws: WebSocket) => new Promise<void>((resolve) => ws.on('open', resolve));

interface AssistMessage {
  v: number;
  type: string;
  requestId?: string;
  command?: string;
  payload?: unknown;
  result?: {
    success: boolean;
    error?: string;
    result?: unknown;
  };
}

// Helper to wait for a specific message type
const waitForMessage = (ws: WebSocket, type: string, requestId?: string) => {
  return new Promise<AssistMessage>((resolve) => {
    const handler = (data: unknown) => {
      try {
        const msg = JSON.parse((data as { toString(): string }).toString());
        if (msg.type === type) {
          if (requestId && msg.requestId !== requestId) return;
          ws.off('message', handler);
          resolve(msg);
        }
      } catch {
        // ignore parse errors
      }
    };
    ws.on('message', handler);
  });
};

// Helper to start server
const startServer = async (port: number, env = {}) => {
  const proc = spawn('node', [SERVER_PATH], {
    env: { ...process.env, ASSIST_PORT: String(port), ASSIST_HOST: '127.0.0.1', ...env },
    stdio: 'pipe',
  });

  await new Promise<void>((resolve, reject) => {
    const onData = (data: Buffer) => {
      if (data.toString().includes('WebSocket on')) {
        resolve();
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', (d) => console.error(`[${port}] stderr:`, d.toString()));
    
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== null && code !== 0) reject(new Error(`Server exited with code ${code}`));
    });

    setTimeout(() => reject(new Error('Timeout starting server')), 5000);
  });

  return proc;
};

describe('Assist Server Protocol', () => {
  let serverProcess: ChildProcess;
  const PORT = BASE_PORT;
  const WS_URL = `ws://127.0.0.1:${PORT}`;

  beforeAll(async () => {
    serverProcess = await startServer(PORT, { ASSIST_EXECUTION_TIMEOUT: '1000' });
  });

  afterAll(() => {
    serverProcess.kill();
  });

  it('should return error when no app client is connected', async () => {
    const ws = new WebSocket(WS_URL);
    await waitForOpen(ws);

    const requestId = 'req-no-client';
    ws.send(JSON.stringify({ v: 1, type: 'execute', command: 'test', requestId }));

    const response = await waitForMessage(ws, 'executeResult', requestId);
    // Verify response shape
    expect(response.v).toBe(1);
    expect(response.result).toBeDefined();
    expect(response.result!.success).toBe(false);
    expect(response.result!.error).toContain('No app client connected');
    
    ws.close();
  });

  it('should route command to app client and return result', async () => {
    // 1. Connect App Client
    const appWs = new WebSocket(WS_URL);
    await waitForOpen(appWs);
    
    // Register as app client
    appWs.send(JSON.stringify({ v: 1, type: 'context', data: { timestamp: Date.now() } }));

    // 2. Connect Agent Client
    const agentWs = new WebSocket(WS_URL);
    await waitForOpen(agentWs);

    const requestId = 'req-success';
    const command = 'addTodo';
    const payload = 'Buy Milk';

    // 3. Agent sends execute
    agentWs.send(JSON.stringify({ v: 1, type: 'execute', command, payload, requestId }));

    // 4. App receives execute
    const appMsg = await waitForMessage(appWs, 'execute');
    expect(appMsg.v).toBe(1);
    expect(appMsg.command).toBe(command);
    expect(appMsg.payload).toBe(payload);
    expect(appMsg.requestId).toBe(requestId);

    // 5. App sends result
    appWs.send(JSON.stringify({
      v: 1,
      type: 'executeResult',
      requestId,
      result: { success: true, result: 'Added' }
    }));

    // 6. Agent receives result
    const agentMsg = await waitForMessage(agentWs, 'executeResult', requestId);
    expect(agentMsg.v).toBe(1);
    expect(agentMsg.result).toBeDefined();
    expect(agentMsg.result!.success).toBe(true);
    expect(agentMsg.result!.result).toBe('Added');

    appWs.close();
    agentWs.close();
  });

  it('should timeout if app client does not respond', async () => {
    // 1. Connect App Client
    const appWs = new WebSocket(WS_URL);
    await waitForOpen(appWs);
    appWs.send(JSON.stringify({ v: 1, type: 'context', data: { timestamp: Date.now() } }));

    // 2. Connect Agent Client
    const agentWs = new WebSocket(WS_URL);
    await waitForOpen(agentWs);

    const requestId = 'req-timeout';
    
    // 3. Agent sends execute
    agentWs.send(JSON.stringify({ v: 1, type: 'execute', command: 'freeze', requestId }));

    // 4. App receives it but does NOTHING (simulating hang)
    await waitForMessage(appWs, 'execute', requestId);

    // 5. Agent should receive timeout error (timeout set to 1s in beforeAll)
    const agentMsg = await waitForMessage(agentWs, 'executeResult', requestId);
    
    expect(agentMsg.result).toBeDefined();
    expect(agentMsg.result!.success).toBe(false);
    expect(agentMsg.result!.error).toMatch(/time.*out/i);

    appWs.close();
    agentWs.close();
  });
});

describe('Assist Server Auth', () => {
  let serverProcess: ChildProcess;
  const PORT = BASE_PORT + 1;
  const WS_URL = `ws://127.0.0.1:${PORT}`;
  const TOKEN = 'secret-123';

  beforeAll(async () => {
    serverProcess = await startServer(PORT, { VIBE_ASSIST_TOKEN: TOKEN });
  });

  afterAll(() => {
    serverProcess.kill();
  });

  it('should reject connection without token', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise<void>((resolve) => {
      ws.on('error', (err) => {
        // ws client emits error on 401/403/close during handshake usually
        expect(err.message).toMatch(/401|Unexpected server response/);
        resolve();
      });
      // In case it connects but closes immediately
      ws.on('close', (code) => {
        expect(code).toBe(1008); // Policy Violation
        resolve();
      });
    });
  });

  it('should reject connection with wrong token', async () => {
    const ws = new WebSocket(`${WS_URL}?token=wrong`);
    
    await new Promise<void>((resolve) => {
      ws.on('error', (err) => {
        expect(err.message).toMatch(/401|Unexpected server response/);
        resolve();
      });
      ws.on('close', (code) => {
        expect(code).toBe(1008);
        resolve();
      });
    });
  });

  it('should accept connection with correct token', async () => {
    const ws = new WebSocket(`${WS_URL}?token=${TOKEN}`);
    await waitForOpen(ws);
    ws.close();
  });
});
