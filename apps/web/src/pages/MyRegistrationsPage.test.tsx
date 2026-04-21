import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MyRegistrationsPage from './MyRegistrationsPage'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn().mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') }),
}))

const mockApiFetch = vi.mocked(apiFetch)

const now = new Date()
const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

const enrolledReg = {
  id: 'reg_1',
  classId: 'class_1',
  userId: 'user_1',
  membershipId: 'mem_1',
  status: 'ENROLLED',
  waitlistPosition: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  class: {
    id: 'class_1',
    title: 'Morning Yoga',
    startsAt: inThreeDays,
    durationMinutes: 60,
    location: 'Studio A',
    status: 'ACTIVE',
  },
}

const waitlistedReg = {
  id: 'reg_2',
  classId: 'class_2',
  userId: 'user_1',
  membershipId: null,
  status: 'WAITLISTED',
  waitlistPosition: 2,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  class: {
    id: 'class_2',
    title: 'HIIT Bootcamp',
    startsAt: inThreeDays,
    durationMinutes: 45,
    location: 'Main Floor',
    status: 'ACTIVE',
  },
}

const attendedReg = {
  id: 'reg_3',
  classId: 'class_3',
  userId: 'user_1',
  membershipId: 'mem_1',
  status: 'ATTENDED',
  waitlistPosition: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  class: {
    id: 'class_3',
    title: 'Power Pilates',
    startsAt: threeDaysAgo,
    durationMinutes: 50,
    location: 'Studio B',
    status: 'COMPLETED',
  },
}

const cancelledReg = {
  id: 'reg_4',
  classId: 'class_4',
  userId: 'user_1',
  membershipId: null,
  status: 'CANCELLED',
  waitlistPosition: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  class: {
    id: 'class_4',
    title: 'Evening Stretch',
    startsAt: threeDaysAgo,
    durationMinutes: 30,
    location: 'Studio A',
    status: 'COMPLETED',
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyRegistrationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MyRegistrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows upcoming registrations by default', async () => {
    mockApiFetch.mockResolvedValueOnce([enrolledReg, waitlistedReg, attendedReg])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.getByText('HIIT Bootcamp')).toBeInTheDocument()
      expect(screen.queryByText('Power Pilates')).not.toBeInTheDocument()
    })
  })

  it('shows past registrations when Past tab is clicked', async () => {
    mockApiFetch.mockResolvedValueOnce([enrolledReg, attendedReg, cancelledReg])

    renderPage()

    await waitFor(() => expect(screen.getByText('Morning Yoga')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /past/i }))

    expect(screen.queryByText('Morning Yoga')).not.toBeInTheDocument()
    expect(screen.getByText('Power Pilates')).toBeInTheDocument()
    expect(screen.getByText('Evening Stretch')).toBeInTheDocument()
  })

  it('shows empty state when no upcoming registrations', async () => {
    mockApiFetch.mockResolvedValueOnce([attendedReg])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no upcoming registrations/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no past registrations', async () => {
    mockApiFetch.mockResolvedValueOnce([enrolledReg])

    renderPage()

    await waitFor(() => expect(screen.getByText('Morning Yoga')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /past/i }))

    expect(screen.getByText(/no past registrations/i)).toBeInTheDocument()
  })

  it('filters registrations by search term', async () => {
    mockApiFetch.mockResolvedValueOnce([enrolledReg, waitlistedReg])

    renderPage()

    await waitFor(() => expect(screen.getByText('Morning Yoga')).toBeInTheDocument())

    await userEvent.type(screen.getByPlaceholderText(/search by class name/i), 'yoga')

    expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
    expect(screen.queryByText('HIIT Bootcamp')).not.toBeInTheDocument()
  })

  it('shows cancel button for upcoming enrolled and waitlisted registrations', async () => {
    mockApiFetch.mockResolvedValueOnce([enrolledReg, waitlistedReg])

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /cancel/i })).toHaveLength(2)
    })
  })

  it('calls DELETE /registrations/:id when cancel is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce([enrolledReg])
      .mockResolvedValueOnce({ ...enrolledReg, status: 'CANCELLED' })
      .mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/registrations/reg_1',
        'token_123',
        { method: 'DELETE' }
      )
    })
  })
})
