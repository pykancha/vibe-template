import { create as createZustand, type StateCreator } from 'zustand';
import { bus } from './bus';
import { commands } from './commands';

interface VibeStoreOptions {
  name: string;
  emitState?: boolean;
  registerCommands?: boolean;
  throttleMs?: number;
}

/**
 * Creates a Zustand store with built-in Vibe instrumentation:
 * - Auto-emits state changes to the devtools bus
 * - Auto-registers basic state commands (get/set/reset)
 * - Namespaces commands to avoid collisions
 */
export function createVibeStore<T extends object>(
  initializer: StateCreator<T>,
  options: VibeStoreOptions
) {
  const store = createZustand<T>(initializer);
  const { name, emitState = true, registerCommands = true, throttleMs = 200 } = options;

  if (import.meta.env.DEV) {
    // 1. Auto-emit state
    if (emitState) {
      let lastEmit = 0;
      store.subscribe((state) => {
        const now = Date.now();
        if (now - lastEmit > throttleMs) {
          lastEmit = now;
          // Strip functions
          const serializable = Object.fromEntries(
            Object.entries(state).filter(([, v]) => typeof v !== 'function')
          );
          bus.emit('state', { name, data: serializable });
        }
      });
    }

    // 2. Auto-register commands
    if (registerCommands) {
      const initialState = store.getState();
      
      commands.register(`${name}.getState`, `Get snapshot of ${name} store`, () => {
        const state = store.getState();
        const serializable = Object.fromEntries(
          Object.entries(state).filter(([, v]) => typeof v !== 'function')
        );
        return serializable;
      });

      commands.register(`${name}.setState`, `Set partial state for ${name}`, (payload) => {
        store.setState(payload as Partial<T>);
      });

      commands.register(`${name}.reset`, `Reset ${name} store to initial state`, () => {
        store.setState(initialState, true); // true = replace
      });
    }
  }

  return store;
}
