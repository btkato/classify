import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LessonSetDetailPage from './LessonSetDetailPage'

vi.mock('../hooks/useLessonSet', () => ({ useLessonSet: vi.fn() }))
vi.mock('../hooks/useMyRegistrations', () => ({ useMyRegistrations: vi.fn() }))
vi.mock('../hooks/useEnrollInLessonSet', () => ({ useEnrollInLessonSet: vi.fn() }))
vi.mock('../hooks/useCancelLessonSetRegistration', () => ({ useCancelLessonSetRegistration: vi.fn() }))
vi.mock('../hooks/useEnroll', () => ({ useEnroll: vi.fn() }))
vi.mock('../hooks/useCancelRegistration', () => ({ useCancelRegistration: vi.fn() }))
vi.mock('@clerk/clerk-react', () => ({ useAuth: vi.fn() }))

import { useLessonSet } from '../hooks/useLessonSet'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { useEnrollInLessonSet } from '../hooks/useEnrollInLessonSet'
import { useCancelLessonSetRegistration } from '../hooks/useCancelLessonSetRegistration'
import { useEnroll } from '../hooks/useEnroll'
import { useCancelRegistration } from '../hooks/useCancelRegistration'
import { useAuth } from '@clerk/clerk-react'

const mockUseLessonSet = vi.mocked(useLessonSet)
const mockUseMyRegistrations = vi.mocked(useMyRegistrations)
const mockUseEnrollInLessonSet = vi.mocked(useEnrollInLessonSet)
const mockUseCancelLessonSetRegistration = vi.mocked(useCancelLessonSetRegistration)
const mockUseEnroll = vi.mocked(useEnroll)
const mockUseCancelRegistration = vi.mocked(useCancelRegistration)
const mockUseAuth = vi.mocked(useAuth)

const mockSessions = [
  {
    id: 'cls_1',
    title: 'Yoga Series',
    description: null,
    categoryId: 'cat_1',
    instructorId: 'user_1',
    lessonSetId: 'ls_1',
    capacity: 10,
    enrolledCount: 6,
    startsAt: '2026-06-01T10:00:00.000Z',
    durationMinutes: 60,
    location: 'Studio A',
    status: 'ACTIVE',
    classNumber: 1,
    sessionNumber: 1,
  },
  {
    id: 'cls_2',
    title: 'Yoga Series',
    description: null,
    categoryId: 'cat_1',
    instructorId: 'user_1',
    lessonSetId: 'ls_1',
    capacity: 10,
    enrolledCount: 5,
    startsAt: '2026-06-08T10:00:00.000Z',
    durationMinutes: 60,
    location: 'Studio A',
    status: 'ACTIVE',
    classNumber: 2,
    sessionNumber: 2,
  },
]

const mockFullSetLessonSet = {
  id: 'ls_1',
  title: 'Yoga Fundamentals Series',
  description: 'A beginner yoga series.',
  enrollmentType: 'FULL_SET',
  totalSessions: 2,
  instructorId: 'user_1',
  categoryId: 'cat_1',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  classes: mockSessions,
}

const mockDropInLessonSet = {
  ...mockFullSetLessonSet,
  id: 'ls_2',
  title: 'Pilates Drop-in Series',
  enrollmentType: 'DROP_IN',
  classes: mockSessions.map((session) => ({ ...session, lessonSetId: 'ls_2' })),
}

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
    title: 'Yoga Series',
    startsAt: '2026-06-01T10:00:00.000Z',
    durationMinutes: 60,
    location: 'Studio A',
    status: 'ACTIVE',
  },
}

function renderPage(id = 'ls_1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/classes/lesson-sets/${id}`]}>
        <Routes>
          <Route path="/classes/lesson-sets/:id" element={<LessonSetDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LessonSetDetailPage', () => {
  const mockEnrollInLessonSetMutate = vi.fn()
  const mockCancelLessonSetMutate = vi.fn()
  const mockEnrollMutate = vi.fn()
  const mockCancelMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEnrollInLessonSet.mockReturnValue({ mutate: mockEnrollInLessonSetMutate } as never)
    mockUseCancelLessonSetRegistration.mockReturnValue({ mutate: mockCancelLessonSetMutate } as never)
    mockUseEnroll.mockReturnValue({ mutate: mockEnrollMutate } as never)
    mockUseCancelRegistration.mockReturnValue({ mutate: mockCancelMutate } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [] } as never)
    mockUseAuth.mockReturnValue({ isSignedIn: true } as never)
  })

  it('shows a loading skeleton while lesson set data is fetching', () => {
    mockUseLessonSet.mockReturnValue({ data: undefined, isLoading: true } as never)

    renderPage()

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows not found when lesson set data is missing', () => {
    mockUseLessonSet.mockReturnValue({ data: undefined, isLoading: false } as never)

    renderPage()

    expect(screen.getByText('Lesson set not found.')).toBeInTheDocument()
  })

  it('renders lesson set title and session count', () => {
    mockUseLessonSet.mockReturnValue({ data: mockFullSetLessonSet, isLoading: false } as never)

    renderPage()

    expect(screen.getByText('Yoga Fundamentals Series')).toBeInTheDocument()
    expect(screen.getByText(/2 sessions/)).toBeInTheDocument()
  })

  it('shows "Sign in to enroll" for a FULL_SET lesson set when not signed in', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false } as never)
    mockUseLessonSet.mockReturnValue({ data: mockFullSetLessonSet, isLoading: false } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Sign in to enroll' })).toBeInTheDocument()
  })

  it('shows "Enroll in Full Series" for a FULL_SET lesson set when signed in and not enrolled', () => {
    mockUseLessonSet.mockReturnValue({ data: mockFullSetLessonSet, isLoading: false } as never)

    renderPage()

    expect(screen.getByRole('button', { name: 'Enroll in Full Series' })).toBeInTheDocument()
  })

  it('shows enrolled confirmation and cancel button when already enrolled in FULL_SET', () => {
    mockUseLessonSet.mockReturnValue({ data: mockFullSetLessonSet, isLoading: false } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [mockEnrolledRegistration] } as never)

    renderPage()

    expect(screen.getByText("You're enrolled in this series")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel Series Enrollment' })).toBeInTheDocument()
  })

  it('calls enroll mutate when "Enroll in Full Series" is clicked', async () => {
    mockUseLessonSet.mockReturnValue({ data: mockFullSetLessonSet, isLoading: false } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Enroll in Full Series' }))

    expect(mockEnrollInLessonSetMutate).toHaveBeenCalledTimes(1)
  })

  it('calls cancel mutate with lessonSetId when "Cancel Series Enrollment" is clicked', async () => {
    mockUseLessonSet.mockReturnValue({ data: mockFullSetLessonSet, isLoading: false } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [mockEnrolledRegistration] } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Series Enrollment' }))

    expect(mockCancelLessonSetMutate).toHaveBeenCalledWith({ lessonSetId: 'ls_1' })
  })

  it('shows per-session Enroll buttons for a DROP_IN lesson set with no series-level CTA', () => {
    mockUseLessonSet.mockReturnValue({ data: mockDropInLessonSet, isLoading: false } as never)

    renderPage('ls_2')

    expect(screen.queryByRole('button', { name: 'Enroll in Full Series' })).not.toBeInTheDocument()
    const enrollButtons = screen.getAllByRole('button', { name: 'Enroll' })
    expect(enrollButtons).toHaveLength(2)
  })

  it('shows a Cancel button for a DROP_IN session the user is enrolled in', () => {
    mockUseLessonSet.mockReturnValue({ data: mockDropInLessonSet, isLoading: false } as never)
    mockUseMyRegistrations.mockReturnValue({ data: [mockEnrolledRegistration] } as never)

    renderPage('ls_2')

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    const enrollButtons = screen.getAllByRole('button', { name: 'Enroll' })
    expect(enrollButtons).toHaveLength(1)
  })
})
