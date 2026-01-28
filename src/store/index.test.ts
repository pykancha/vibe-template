import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './index';

// We need to mock createVibeStore if we want to test purely logic,
// but since it's an integration test of the store, we can test it as is.
// However, JSDOM environment is recommended.

describe('useStore', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('has initial state', () => {
    const state = useStore.getState();
    expect(state.user).toBe(null);
    expect(state.todos).toEqual([]);
    expect(state.theme).toBe('dark');
  });

  it('sets user', () => {
    useStore.getState().setUser({ id: '1', name: 'Alice' });
    expect(useStore.getState().user).toEqual({ id: '1', name: 'Alice' });
  });

  it('sets theme', () => {
    useStore.getState().setTheme('light');
    expect(useStore.getState().theme).toBe('light');
    // Verify document class list if in jsdom
    if (typeof document !== 'undefined') {
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    }
  });

  it('adds todo', () => {
    useStore.getState().addTodo('Buy Milk');
    const todos = useStore.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe('Buy Milk');
    expect(todos[0].done).toBe(false);
  });

  it('toggles todo', () => {
    useStore.getState().addTodo('Test');
    const id = useStore.getState().todos[0].id;
    
    useStore.getState().toggleTodo(id);
    expect(useStore.getState().todos[0].done).toBe(true);
    
    useStore.getState().toggleTodo(id);
    expect(useStore.getState().todos[0].done).toBe(false);
  });

  it('removes todo', () => {
    useStore.getState().addTodo('Delete Me');
    const id = useStore.getState().todos[0].id;
    
    useStore.getState().removeTodo(id);
    expect(useStore.getState().todos).toHaveLength(0);
  });

  it('clears todos', () => {
    useStore.getState().addTodo('1');
    useStore.getState().addTodo('2');
    
    useStore.getState().clearTodos();
    expect(useStore.getState().todos).toHaveLength(0);
  });
});
