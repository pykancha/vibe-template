import './index.css'
import { useEffect, useMemo, useState } from 'react'
import { Route, Routes, Link } from 'react-router-dom'
import { useStore } from '@/store'
import { DevAssistant, connectAssist } from '@/devtools'

function Home() {
  const { theme, setTheme, user, setUser, todos, addTodo, toggleTodo, removeTodo, clearTodos } = useStore()
  const [text, setText] = useState('')

  const doneCount = useMemo(() => todos.filter((t) => t.done).length, [todos])

  return (
    <main className="space-y-6">
      <section className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">State Demo</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">Theme:</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">User:</span>
            {user ? (
              <span className="text-green-400">{user.name}</span>
            ) : (
              <button
                onClick={() => setUser({ id: '1', name: 'Demo User' })}
                className="px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-2">Todos</h2>
        <p className="text-zinc-400 mb-4">
          {doneCount}/{todos.length} done
        </p>

        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault()
            addTodo(text)
            setText('')
          }}
        >
          <input
            className="flex-1 px-3 py-2 rounded bg-zinc-950 border border-zinc-800"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a todo"
            aria-label="New todo text"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 transition"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => clearTodos()}
            className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 transition"
          >
            Clear
          </button>
        </form>

        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <button
                className="flex-1 text-left px-3 py-2 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700"
                onClick={() => toggleTodo(t.id)}
                aria-checked={t.done}
                role="checkbox"
              >
                <span className={t.done ? 'line-through text-zinc-500' : ''}>{t.text}</span>
              </button>
              <button
                className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 transition"
                onClick={() => removeTodo(t.id)}
                aria-label={`Remove ${t.text}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">Console Demo</h2>
        <div className="flex gap-2">
          <button
            onClick={() => console.log('Hello from app!')}
            className="px-3 py-1 bg-blue-700 rounded hover:bg-blue-600 transition"
          >
            Log
          </button>
          <button
            onClick={() => console.warn('Warning message')}
            className="px-3 py-1 bg-yellow-700 rounded hover:bg-yellow-600 transition"
          >
            Warn
          </button>
          <button
            onClick={() => console.error('Error message')}
            className="px-3 py-1 bg-red-700 rounded hover:bg-red-600 transition"
          >
            Error
          </button>
          <button
            onClick={() => {
              // Ensure base ends with /
              const base = import.meta.env.BASE_URL.endsWith('/')
                ? import.meta.env.BASE_URL
                : `${import.meta.env.BASE_URL}/`
              fetch(`${base}api/test`).catch(() => {})
            }}
            className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600 transition"
          >
            Fetch
          </button>
        </div>
      </section>
    </main>
  )
}

function About() {
  return (
    <main className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
      <h2 className="text-xl font-semibold mb-2">About</h2>
      <p className="text-zinc-300">HashRouter skeleton: basic routes so agent navigation is meaningful.</p>
    </main>
  )
}

function App() {
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_ASSIST === '1') {
      connectAssist()
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Vibe Template
        </h1>
        <p className="text-zinc-400 mt-2">AI-introspectable React scaffold with dev observability</p>
        <nav className="mt-4 flex gap-4">
          <Link className="text-zinc-300 hover:text-white underline" to="/">
            Home
          </Link>
          <Link className="text-zinc-300 hover:text-white underline" to="/about">
            About
          </Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>

      {import.meta.env.DEV && import.meta.env.VITE_ASSIST === '1' && <DevAssistant />}
    </div>
  )
}

export default App
