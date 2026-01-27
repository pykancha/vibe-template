
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

// @vitest-environment node

describe('Assist Server Protocol', () => {
  let serverProcess: ChildProcess;
  const PORT = 3002; // Use a different port for testing
  const WS_URL = `ws://127.0.0.1:${PORT}`;

  beforeAll(async () => {
    // Start the server as a child process
    const serverPath = path.resolve(__dirname, 'server.js');
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, ASSIST_PORT: String(PORT), ASSIST_HOST: '127.0.0.1' },
      stdio: 'pipe',
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      serverProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('WebSocket on')) {
          resolve();
        }
      });
      serverProcess.stderr?.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });
      serverProcess.on('error', reject);
      serverProcess.on('exit', (code) => {
        if (code !== null && code !== 0) reject(new Error(`Server exited with code ${code}`));
      });
      
      // Timeout fallback
      setTimeout(() => reject(new Error('Timeout waiting for server start')), 5000);
    });
  });

  afterAll(() => {
    serverProcess.kill();
  });

  it('should return standardized error shape when no app client is connected', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    const requestId = 'test-req-1';
    
    // Send execute command
    ws.send(JSON.stringify({
      type: 'execute',
      command: 'testCommand',
      requestId,
    }));

    // Wait for response
    interface ExecuteResult {
      type: string;
      requestId: string;
      result: {
        success: boolean;
        error?: string;
        ok?: boolean;
      };
    }
    const response = await new Promise<ExecuteResult>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'executeResult' && msg.requestId === requestId) {
          resolve(msg);
        }
      });
    });

    ws.close();

    // Verify response shape
    // Should be { success: false, error: ... } not { ok: false, error: ... }
    expect(response.result).toBeDefined();
    expect(response.result.success).toBe(false);
    expect(response.result.error).toContain('No app client connected');
    expect(response.result.ok).toBeUndefined(); // Should NOT use 'ok'
  });
});
