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
          // Strip functions and handle circular references
          try {
            const cleanState = JSON.parse(JSON.stringify(
                Object.fromEntries(
                    Object.entries(state).filter(([, v]) => typeof v !== 'function')
                )
            ));
             bus.emit('state', { name, data: cleanState });
          } catch (e) {
             // Fallback for circular refs if simple stringify fails
             // We can use a simpler approach: just don't emit deeply circular stuff or warn
             console.warn(`[vibe] Failed to serialize state for ${name}`, e);
             bus.emit('state', { name, data: { error: 'State serialization failed (circular?)' } });
          }
        }
      });
    }

    // 2. Auto-register commands
    if (registerCommands) {
      const initialState = store.getState();
      
      commands.register(`${name}.getState`, `Get snapshot of ${name} store`, () => {
        const state = store.getState();
        try {
            return JSON.parse(JSON.stringify(
                Object.fromEntries(
                    Object.entries(state).filter(([, v]) => typeof v !== 'function')
                )
            ));
        } catch {
            return { error: 'State serialization failed' };
        }
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
