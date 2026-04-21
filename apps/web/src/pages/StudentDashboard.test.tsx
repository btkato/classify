import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StudentDashboard from './StudentDashboard'
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
const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

const upcomingEnrolled = {
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

const upcomingWaitlisted = {
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

const outsideWeek = {
  ...upcomingEnrolled,
  id: 'reg_3',
  class: { ...upcomingEnrolled.class, id: 'class_3', title: 'Far Future Pilates', startsAt: inTenDays },
}

const pastRegistration = {
  ...upcomingEnrolled,
  id: 'reg_4',
  status: 'ATTENDED',
  class: { ...upcomingEnrolled.class, id: 'class_4', title: 'Old Yoga', startsAt: threeDaysAgo },
}

const activeMembership = {
  id: 'mem_1',
  type: 'MONTHLY',
  status: 'ACTIVE',
  expiresAt: '2026-05-20T00:00:00.000Z',
  classesRemaining: null,
  classesTotal: null,
  priority: 1,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
}

const classPack = {
  id: 'mem_2',
  type: 'CLASS_PACK_10',
  status: 'ACTIVE',
  expiresAt: null,
  classesRemaining: 7,
  classesTotal: 10,
  priority: 2,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders upcoming registrations within the next 7 days', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingEnrolled, upcomingWaitlisted])
      .mockResolvedValueOnce([activeMembership])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.getByText('HIIT Bootcamp')).toBeInTheDocument()
    })
  })

  it('does not show registrations outside the next 7 days', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingEnrolled, outsideWeek])
      .mockResolvedValueOnce([activeMembership])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.queryByText('Far Future Pilates')).not.toBeInTheDocument()
    })
  })

  it('does not show past registrations', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingEnrolled, pastRegistration])
      .mockResolvedValueOnce([activeMembership])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.queryByText('Old Yoga')).not.toBeInTheDocument()
    })
  })

  it('shows waitlist position badge for waitlisted registrations', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingWaitlisted])
      .mockResolvedValueOnce([activeMembership])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Waitlist #2')).toBeInTheDocument()
    })
  })

  it('shows empty state when no upcoming classes this week', async () => {
    mockApiFetch
      .mockResolvedValueOnce([pastRegistration])
      .mockResolvedValueOnce([activeMembership])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no classes this week/i)).toBeInTheDocument()
    })
  })

  it('renders active memberships', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingEnrolled])
      .mockResolvedValueOnce([activeMembership, classPack])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument()
      expect(screen.getByText('Class Pack (10)')).toBeInTheDocument()
      expect(screen.getByText(/expires/i)).toBeInTheDocument()
      expect(screen.getByText(/7 classes remaining/i)).toBeInTheDocument()
    })
  })

  it('shows empty state with purchase link when no active memberships', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingEnrolled])
      .mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no active memberships/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /purchase a membership/i })).toBeInTheDocument()
    })
  })

  it('renders quick links to browse classes, all registrations, and memberships', async () => {
    mockApiFetch
      .mockResolvedValueOnce([upcomingEnrolled])
      .mockResolvedValueOnce([activeMembership])

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /browse classes/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /all registrations/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /my memberships/i })).toBeInTheDocument()
    })
  })
})
