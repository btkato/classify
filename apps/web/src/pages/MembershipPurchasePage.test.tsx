import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MembershipPurchasePage from './MembershipPurchasePage'
import { apiFetch } from '../lib/api'
import { useMembershipPlans } from '../hooks/useMembershipPlans'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn().mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') }),
}))

vi.mock('../hooks/useMembershipPlans')

const mockApiFetch = vi.mocked(apiFetch)
const mockUseMembershipPlans = vi.mocked(useMembershipPlans)

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockPlans = [
  { id: 'plan_1', type: 'DROP_IN', displayName: 'Drop-in', description: 'Single class access. No expiry.', priceInCents: 2000, stripePriceId: null, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'plan_2', type: 'CLASS_PACK_5', displayName: 'Class Pack (5)', description: '5 classes. No expiry.', priceInCents: 8500, stripePriceId: null, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'plan_3', type: 'CLASS_PACK_10', displayName: 'Class Pack (10)', description: '10 classes. No expiry.', priceInCents: 16000, stripePriceId: null, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'plan_4', type: 'MONTHLY', displayName: 'Monthly', description: 'Unlimited classes. 30 days access.', priceInCents: 12000, stripePriceId: null, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'plan_5', type: 'CONTINUOUS_MONTHLY', displayName: 'Continuous Monthly', description: 'Unlimited classes. Auto-renews monthly.', priceInCents: 11000, stripePriceId: null, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'plan_6', type: 'YEARLY', displayName: 'Yearly', description: 'Unlimited classes. 365 days.', priceInCents: 110000, stripePriceId: null, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
]

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
    mockUseMembershipPlans.mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as ReturnType<typeof useMembershipPlans>)
  })

  it('renders all 6 membership plan options from the API', () => {
    renderPage()

    expect(screen.getByText('Drop-in')).toBeInTheDocument()
    expect(screen.getByText('Class Pack (5)')).toBeInTheDocument()
    expect(screen.getByText('Class Pack (10)')).toBeInTheDocument()
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Continuous Monthly')).toBeInTheDocument()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
  })

  it('shows skeletons while plans are loading', () => {
    mockUseMembershipPlans.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMembershipPlans>)

    renderPage()

    expect(screen.queryByText('Drop-in')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('plan-skeleton')).toHaveLength(6)
  })

  it('formats CONTINUOUS_MONTHLY price with /mo suffix', () => {
    renderPage()

    expect(screen.getByText('$110/mo')).toBeInTheDocument()
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
