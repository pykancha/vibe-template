import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import App from './App'

test('renders app title', () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )

  expect(screen.getByText('Vibe Template')).toBeInTheDocument()
})

test('can add and toggle a todo', async () => {
  const user = userEvent.setup()

  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )

  await user.type(screen.getByPlaceholderText('Add a todo'), 'Buy milk')
  await user.click(screen.getByRole('button', { name: 'Add' }))

  const todo = screen.getByRole('checkbox', { name: 'Buy milk' })
  expect(todo).toBeInTheDocument()
  expect(todo).not.toBeChecked()

  await user.click(todo)
  expect(todo).toBeChecked()
  expect(screen.getByText('Buy milk')).toHaveClass('line-through')
})

test('theme toggle is accessible and updates label', async () => {
  const user = userEvent.setup()

  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )

  // Default is dark mode, so button should say "dark" and offer switch to "light"
  const button = screen.getByRole('button', { name: /switch to light mode/i })
  expect(button).toBeInTheDocument()
  expect(button).toHaveTextContent('dark')

  await user.click(button)

  // Now it should be light mode
  expect(button).toHaveTextContent('light')
  expect(button).toHaveAttribute('aria-label', 'Switch to dark mode')
})
