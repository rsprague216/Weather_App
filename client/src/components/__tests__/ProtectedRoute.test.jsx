import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'

const mockUseAuth = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

describe('ProtectedRoute', () => {
  it('shows loading state while auth is restoring', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: true })

    render(
      <MemoryRouter initialEntries={['/locations']}>
        <ProtectedRoute>
          <div>Secret Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false })

    render(
      <MemoryRouter initialEntries={['/locations']}>
        <Routes>
          <Route
            path="/locations"
            element={(
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders children for authenticated users', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Secret Content')).toBeInTheDocument()
  })
})
