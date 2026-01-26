import { render, screen } from '@testing-library/react'
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
