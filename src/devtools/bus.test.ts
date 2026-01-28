import { describe, it, expect, vi, afterEach } from 'vitest';
import { bus } from './bus';

describe('DebugBus', () => {
  afterEach(() => {
    bus.clear();
    vi.restoreAllMocks();
  });

  it('should emit and receive events', () => {
    const listener = vi.fn();
    const cleanup = bus.subscribe(listener);
    
    bus.emit('log', { message: 'test' });
    
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'log',
      data: { message: 'test' }
    }));
    
    cleanup();
  });

  it('should buffer events', () => {
    bus.emit('log', 'one');
    bus.emit('log', 'two');
    
    const buffer = bus.getBuffer();
    expect(buffer).toHaveLength(2);
    expect(buffer[0].data).toBe('one');
    expect(buffer[1].data).toBe('two');
  });

  it('should get context correctly', () => {
    bus.emit('log', 'log1');
    bus.emit('error', 'error1');
    bus.emit('state', { foo: 'bar' });
    bus.emit('network', { url: '/api' });

    const context = bus.getContext();
    expect(context.logs).toHaveLength(2); // log + error
    expect(context.lastError).toBeDefined();
    expect(context.lastState).toBeDefined();
    expect(context.recentNetwork).toHaveLength(1);
  });
});

describe('Console Patching (Integration)', () => {
  // These tests rely on the side-effects of importing bus.ts
  // Assuming import.meta.env.DEV is true in test environment
  
  it('console.log should emit log event to bus', () => {
    const spy = vi.spyOn(bus, 'emit');
    // Note: We cannot spy on console.log here because that would replace the patch.
    // We rely on the patch being present.
    
    console.log('test message');
    
    expect(spy).toHaveBeenCalledWith('log', expect.objectContaining({
        level: 'log',
        args: ['test message']
    }));
  });

  it('console.error should emit error event to bus', () => {
    const spy = vi.spyOn(bus, 'emit');
    
    console.error('test error');
    
    expect(spy).toHaveBeenCalledWith('error', expect.objectContaining({
        level: 'error',
        args: ['test error']
    }));
  });
});

describe('Fetch Patching (Integration)', () => {
  it('window.fetch should emit network event to bus', async () => {
    const spy = vi.spyOn(bus, 'emit');
    
    // Calling fetch might fail in jsdom if not polyfilled/mocked, 
    // but the wrapper should catch the error and emit a failed network event.
    try {
        await window.fetch('http://example.com/test-fetch');
    } catch {
        // Ignore expected fetch failure
    }
    
    expect(spy).toHaveBeenCalledWith('network', expect.objectContaining({
        url: 'http://example.com/test-fetch',
        method: 'GET'
    }));
  });
});
