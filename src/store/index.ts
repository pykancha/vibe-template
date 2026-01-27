// Zustand store with dev bus integration
import { createVibeStore } from '@/devtools/store-wrapper';

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

export const useStore = createVibeStore<AppState>((set) => ({
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
}), {
  name: 'app',
});

// Register extra commands (dev only)
if (import.meta.env.DEV) {
  import('@/devtools/commands').then(({ commands }) => {
    // Legacy support
    commands.register('setTheme', 'Set theme (legacy)', (payload) => {
      const theme = payload === 'light' || payload === 'dark' ? payload : null;
      if (!theme) throw new Error('setTheme payload must be "light" or "dark"');
      useStore.getState().setTheme(theme);
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
  });
}

