import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVibeStore } from './store-wrapper';
import { commands } from './commands';
import { bus } from './bus';

// Mock bus emit
vi.spyOn(bus, 'emit');

interface TestState {
  count: number;
  inc: () => void;
}

describe('createVibeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear commands for isolation if possible, but they are global singleton.
    // We can just check if register was called.
    vi.spyOn(commands, 'register');
  });

  it('creates a working zustand store', () => {
    const useStore = createVibeStore<TestState>((set) => ({
      count: 0,
      inc: () => set((s) => ({ count: s.count + 1 })),
    }), { name: 'test1' });

    expect(useStore.getState().count).toBe(0);
    useStore.getState().inc();
    expect(useStore.getState().count).toBe(1);
  });

  it('registers devtools commands', () => {
    createVibeStore<TestState>((set) => ({
      count: 0,
      inc: () => set((s) => ({ count: s.count + 1 })),
    }), { name: 'test2' });

    // We expect commands to be registered
    const list = commands.list();
    expect(list.find(c => c.name === 'test2.getState')).toBeDefined();
    expect(list.find(c => c.name === 'test2.setState')).toBeDefined();
    expect(list.find(c => c.name === 'test2.reset')).toBeDefined();
  });

  it('emits state changes to bus', () => {
    // We need to use fake timers because of throttling
    vi.useFakeTimers();

    const useStore = createVibeStore<TestState>((set) => ({
      count: 0,
      inc: () => set((s) => ({ count: s.count + 1 })),
    }), { name: 'test3', throttleMs: 100 });

    useStore.getState().inc();
    
    // Fast forward
    vi.advanceTimersByTime(150);

    expect(bus.emit).toHaveBeenCalledWith('state', {
      name: 'test3',
      data: { count: 1 } // Function 'inc' should be stripped
    });

    vi.useRealTimers();
  });

  it('supports command execution', async () => {
    const useStore = createVibeStore<TestState>((set) => ({
      count: 10,
      inc: () => set((s) => ({ count: s.count + 1 })),
    }), { name: 'test4' });

    // Test setState command
    await commands.execute('test4.setState', { count: 20 });
    expect(useStore.getState().count).toBe(20);

    // Test reset command
    await commands.execute('test4.reset');
    expect(useStore.getState().count).toBe(10); // Resets to initial
  });

  it('handles circular references safely', () => {
    vi.useFakeTimers();
    // Silence expected warning
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circular: any = { val: 1 };
    circular.self = circular;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useStore = createVibeStore<any>((set) => ({
      data: circular,
      update: () => set({ data: { ...circular, updated: true } }),
    }), { name: 'test-circular', throttleMs: 0 });

    // Should not throw when emitting state
    expect(() => {
        useStore.getState().update();
        vi.runAllTimers();
    }).not.toThrow();

    // Verify warning was logged
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to serialize state'), expect.any(Error));
    consoleSpy.mockRestore();

    // The emitted event should contain a safe version or error
    const calls = vi.mocked(bus.emit).mock.calls;
    const stateEvents = calls.filter(c => c[0] === 'state');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastEvent = stateEvents[stateEvents.length - 1][1] as any;
    
    expect(lastEvent.name).toBe('test-circular');
    // We expect an error object in data, or at least JSON-safe data
    expect(() => JSON.stringify(lastEvent.data)).not.toThrow();
    
    // In our implementation, we emit { error: ... } on failure
    if (lastEvent.data.error) {
        expect(lastEvent.data.error).toBe('State serialization failed');
    }

    vi.useRealTimers();
  });
});
