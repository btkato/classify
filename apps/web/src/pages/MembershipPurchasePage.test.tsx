import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MembershipPurchasePage from './MembershipPurchasePage'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn().mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') }),
}))

const mockApiFetch = vi.mocked(apiFetch)

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MembershipPurchasePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MembershipPurchasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 6 membership type options', () => {
    renderPage()

    expect(screen.getByText('Drop-in')).toBeInTheDocument()
    expect(screen.getByText('Class Pack (5)')).toBeInTheDocument()
    expect(screen.getByText('Class Pack (10)')).toBeInTheDocument()
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Continuous Monthly')).toBeInTheDocument()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
  })

  it('renders a back link to /memberships', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /back to memberships/i })).toBeInTheDocument()
  })

  it('Purchase button is disabled when no type is selected', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /purchase/i })).toBeDisabled()
  })

  it('enables Purchase button when a membership type is selected', async () => {
    renderPage()

    await userEvent.click(screen.getByText('Monthly'))

    expect(screen.getByRole('button', { name: /purchase/i })).not.toBeDisabled()
  })

  it('calls POST /memberships with the selected type on submit', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'mem_1', type: 'MONTHLY', status: 'ACTIVE' })

    renderPage()

    await userEvent.click(screen.getByText('Monthly'))
    await userEvent.click(screen.getByRole('button', { name: /purchase/i }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/memberships',
        'token_123',
        { method: 'POST', body: JSON.stringify({ type: 'MONTHLY' }) }
      )
    })
  })

  it('navigates to /memberships after a successful purchase', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'mem_1', type: 'MONTHLY', status: 'ACTIVE' })

    renderPage()

    await userEvent.click(screen.getByText('Monthly'))
    await userEvent.click(screen.getByRole('button', { name: /purchase/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/memberships')
    })
  })

  it('disables Purchase button while mutation is pending', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))

    renderPage()

    await userEvent.click(screen.getByText('Monthly'))
    await userEvent.click(screen.getByRole('button', { name: /purchase/i }))

    expect(screen.getByRole('button', { name: /purchase/i })).toBeDisabled()
  })
})
