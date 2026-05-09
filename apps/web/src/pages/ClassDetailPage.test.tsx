import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ClassDetailPage from './ClassDetailPage'

vi.mock('../hooks/useClass', () => ({
  useClass: vi.fn(),
}))

vi.mock('../hooks/useMyRegistrations', () => ({
  useMyRegistrations: vi.fn(),
}))

vi.mock('../hooks/useEnroll', () => ({
  useEnroll: vi.fn(),
}))

vi.mock('../hooks/useCancelRegistration', () => ({
  useCancelRegistration: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

import { useClass } from '../hooks/useClass'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { useEnroll } from '../hooks/useEnroll'
import { useCancelRegistration } from '../hooks/useCancelRegistration'
import { useAuth } from '@clerk/clerk-react'

const mockUseClass = vi.mocked(useClass)
const mockUseMyRegistrations = vi.mocked(useMyRegistrations)
const mockUseEnroll = vi.mocked(useEnroll)
const mockUseCancelRegistration = vi.mocked(useCancelRegistration)
const mockUseAuth = vi.mocked(useAuth)

const mockClass = {
  id: 'cls_1',
  title: 'Morning Yoga Flow',
  description: 'A relaxing morning session.',
  categoryId: 'cat_1',
  instructorId: 'user_1',
  capacity: 10,
  enrolledCount: 6,
  startsAt: '2026-05-01T09:00:00.000Z',
  durationMinutes: 60,
  location: 'Studio A',
  status: 'ACTIVE',
  classNumber: 1,
  sessionNumber: null,
}

const mockClassFull = { ...mockClass, capacity: 8, enrolledCount: 8 }

const mockEnrolledRegistration = {
  id: 'reg_1',
  classId: 'cls_1',
  userId: 'user_1',
  membershipId: null,
  status: 'ENROLLED',
  waitlistPosition: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  class: {
    id: 'cls_1',
    title: 'Morning Yoga Flow',
    startsAt: '2026-05-01T09:00:00.000Z',
    durationMinutes: 60,
    location: null,
    status: 'ACTIVE',
  },
}

const mockWaitlistedRegistration = {
  ...mockEnrolledRegistration,
  id: 'reg_2',
  status: 'WAITLISTED',
  waitlistPosition: 1,
}

function renderPage(id = 'cls_1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/classes/${id}`]}>
        <Routes>
          <Route path="/classes/:id" element={<ClassDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClassDetailPage', () => {
  const mockEnrollMutate = vi.fn()
  const mockCancelMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEnroll.mockReturnValue({ mutate: mockEnrollMutate } as never)
    mockUseCancelRegistration.mockReturnValue({ mutate: mockCancelMutate } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [] } as never)
  })

  it('shows a loading state while class data is fetching', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({ data: undefined, isLoading: true } as never)

    renderPage()

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows not found when class data is missing', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({ data: undefined, isLoading: false } as never)

    renderPage()

    expect(screen.getByText('Class not found.')).toBeInTheDocument()
  })

  it('renders class details', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)

    renderPage()

    expect(screen.getByText('Morning Yoga Flow')).toBeInTheDocument()
    expect(screen.getByText('A relaxing morning session.')).toBeInTheDocument()
    expect(screen.getByText('Studio A')).toBeInTheDocument()
  })

  it('shows "Sign in to enroll" for a guest', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Sign in to enroll' })).toBeInTheDocument()
  })

  it('shows "Enroll" when signed in and space is available', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Enroll' })).toBeInTheDocument()
  })

  it('shows "Join Waitlist" when signed in and class is full', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
    mockUseClass.mockReturnValue({ data: mockClassFull, isLoading: false } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument()
  })

  it('shows "Cancel enrollment" when already enrolled', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [mockEnrolledRegistration] } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Cancel enrollment' })).toBeInTheDocument()
  })

  it('shows "Cancel waitlist position" when waitlisted', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [mockWaitlistedRegistration] } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Cancel waitlist position' })).toBeInTheDocument()
  })

  it('calls enroll mutate when "Enroll" is clicked', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Enroll' }))

    expect(mockEnrollMutate).toHaveBeenCalledTimes(1)
  })

  it('calls cancel mutate with registrationId and classId when "Cancel enrollment" is clicked', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [mockEnrolledRegistration] } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel enrollment' }))

    expect(mockCancelMutate).toHaveBeenCalledWith({ registrationId: 'reg_1', classId: 'cls_1' })
  })

  it('redirects guest to sign-in when "Sign in to enroll" is clicked', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Sign in to enroll' }))

    expect(screen.queryByText('Morning Yoga Flow')).not.toBeInTheDocument()
  })

  it('shows "View Full Series" link when the class belongs to a lesson set', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({
      data: { ...mockClass, lessonSetId: 'ls_1' },
      isLoading: false,
    } as never)

    renderPage()

    expect(screen.getByRole('link', { name: /view full series/i })).toBeInTheDocument()
  })

  it('does not show "View Full Series" link for a standalone class', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseClass.mockReturnValue({ data: mockClass, isLoading: false } as never)

    renderPage()

    expect(screen.queryByRole('link', { name: /view full series/i })).not.toBeInTheDocument()
  })
})
