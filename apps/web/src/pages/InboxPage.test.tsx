import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InboxPage from './InboxPage'

vi.mock('../hooks/useInbox', () => ({ useInbox: vi.fn() }))
vi.mock('../hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))

import { useInbox } from '../hooks/useInbox'
import { useCurrentUser } from '../hooks/useCurrentUser'

const mockUseInbox = vi.mocked(useInbox)
const mockUseCurrentUser = vi.mocked(useCurrentUser)

const adminUser = {
  id: 'user_admin',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: [{ role: 'ADMIN' }],
}

const instructorUser = {
  id: 'user_instructor',
  email: 'jane@test.com',
  firstName: 'Jane',
  lastName: 'Smith',
  roles: [{ role: 'INSTRUCTOR' }],
}

const threads = [
  {
    threadId: 'thread_1',
    type: 'DIRECT' as const,
    classId: null,
    className: null,
    participants: [
      { userId: 'user_admin', canReply: true, user: { firstName: 'Admin', lastName: 'User' } },
      { userId: 'user_instructor', canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
    ],
    latestMessage: {
      id: 'msg_1',
      body: 'Hello from Jane',
      sentAt: '2026-04-24T10:00:00.000Z',
      senderId: 'user_instructor',
      readAt: null,
    },
  },
  {
    threadId: 'thread_2',
    type: 'ANNOUNCEMENT' as const,
    classId: 'class_1',
    className: 'Yoga Flow Advanced',
    participants: [
      { userId: 'user_admin', canReply: false, user: { firstName: 'Admin', lastName: 'User' } },
      { userId: 'user_instructor', canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
    ],
    latestMessage: {
      id: 'msg_2',
      body: 'Reminder: bring a mat',
      sentAt: '2026-04-23T09:00:00.000Z',
      senderId: 'user_instructor',
      readAt: '2026-04-23T09:05:00.000Z',
    },
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/inbox']}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/compose" element={<p>Compose</p>} />
          <Route path="/inbox/:threadId" element={<p>Thread</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InboxPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrentUser.mockReturnValue({ data: adminUser, isLoading: false } as never)
  })

  it('shows skeletons while inbox is loading', () => {
    mockUseInbox.mockReturnValue({ data: undefined, isLoading: true } as never)

    renderPage()

    expect(screen.getAllByTestId('thread-skeleton')).toHaveLength(3)
  })

  it('shows thread list with correct labels when loaded', () => {
    mockUseInbox.mockReturnValue({ data: threads, isLoading: false } as never)

    renderPage()

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Yoga Flow Advanced')).toBeInTheDocument()
    expect(screen.getByText('Hello from Jane')).toBeInTheDocument()
    expect(screen.getByText('Reminder: bring a mat')).toBeInTheDocument()
  })

  it('shows unread indicator for thread with unread latest message', () => {
    mockUseInbox.mockReturnValue({ data: threads, isLoading: false } as never)

    renderPage()

    expect(screen.getByTestId('unread-dot-thread_1')).toBeInTheDocument()
  })

  it('does not show unread indicator for a read thread', () => {
    mockUseInbox.mockReturnValue({ data: threads, isLoading: false } as never)

    renderPage()

    expect(screen.queryByTestId('unread-dot-thread_2')).not.toBeInTheDocument()
  })

  it('shows compose button for admin users', () => {
    mockUseInbox.mockReturnValue({ data: threads, isLoading: false } as never)

    renderPage()

    expect(screen.getByRole('link', { name: /compose/i })).toBeInTheDocument()
  })

  it('does not show compose button for non-admin users', () => {
    mockUseCurrentUser.mockReturnValue({ data: instructorUser, isLoading: false } as never)
    mockUseInbox.mockReturnValue({ data: threads, isLoading: false } as never)

    renderPage()

    expect(screen.queryByRole('link', { name: /compose/i })).not.toBeInTheDocument()
  })

  it('shows empty state when there are no threads', () => {
    mockUseInbox.mockReturnValue({ data: [], isLoading: false } as never)

    renderPage()

    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
  })
})
