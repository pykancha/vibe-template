// Zustand store with dev bus integration
import { create } from 'zustand';
import { bus } from '@/devtools/bus';
import { commands } from '@/devtools/commands';

// Generic app state - extend this for your app
export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface AppState {
  // Example state fields
  user: { id: string; name: string } | null;
  theme: 'light' | 'dark';
  todos: Todo[];

  // Actions
  setUser: (user: AppState['user']) => void;
  setTheme: (theme: AppState['theme']) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearTodos: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  theme: 'dark' as const,
  todos: [] as Todo[],
};

function applyTheme(theme: AppState['theme']) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

applyTheme(initialState.theme);

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  addTodo: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    set((s) => ({ todos: [...s.todos, { id, text: trimmed, done: false }] }));
  },
  toggleTodo: (id) => {
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  },
  removeTodo: (id) => {
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
  },
  clearTodos: () => set({ todos: [] }),

  reset: () => set(initialState),
}));

// Subscribe to state changes and emit to bus (dev only)
if (import.meta.env.DEV) {
  let lastEmit = 0;
  const throttleMs = 100;

  useStore.subscribe((state) => {
    const now = Date.now();
    if (now - lastEmit > throttleMs) {
      lastEmit = now;
      // Strip functions from state for serialization
      const serializable = Object.fromEntries(
        Object.entries(state).filter(([, v]) => typeof v !== 'function')
      );
      bus.emit('state', serializable);
    }
  });

  // Register store commands
  commands.register('resetState', 'Reset app state to initial values', () => {
    useStore.getState().reset();
  });

  commands.register('setState', 'Set partial state', (payload) => {
    useStore.setState(payload as Partial<AppState>);
  });

  commands.register('getState', 'Get current state snapshot', () => {
    const state = useStore.getState();
    const serializable = Object.fromEntries(
      Object.entries(state).filter(([, v]) => typeof v !== 'function')
    );
    console.log('[State Snapshot]', serializable);
  });

  commands.register('addTodo', 'Add a todo (payload: string)', (payload) => {
    useStore.getState().addTodo(String(payload ?? ''));
  });

  commands.register('toggleTodo', 'Toggle todo done state (payload: id)', (payload) => {
    useStore.getState().toggleTodo(String(payload ?? ''));
  });

  commands.register('clearTodos', 'Clear all todos', () => {
    useStore.getState().clearTodos();
  });
}
