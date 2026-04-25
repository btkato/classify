import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ThreadPage from './ThreadPage'

vi.mock('../hooks/useThread', () => ({ useThread: vi.fn() }))
vi.mock('../hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../hooks/useReplyToThread', () => ({ useReplyToThread: vi.fn() }))
vi.mock('../hooks/useSendAnnouncement', () => ({ useSendAnnouncement: vi.fn() }))

import { useThread } from '../hooks/useThread'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useReplyToThread } from '../hooks/useReplyToThread'
import { useSendAnnouncement } from '../hooks/useSendAnnouncement'

const mockUseThread = vi.mocked(useThread)
const mockUseCurrentUser = vi.mocked(useCurrentUser)
const mockUseReplyToThread = vi.mocked(useReplyToThread)
const mockUseSendAnnouncement = vi.mocked(useSendAnnouncement)

const currentUser = {
  id: 'user_admin',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: [{ role: 'ADMIN' }],
}

const directThread = {
  threadId: 'thread_1',
  type: 'DIRECT' as const,
  classId: null,
  participants: [
    { userId: 'user_admin', canReply: true, user: { firstName: 'Admin', lastName: 'User' } },
    { userId: 'user_instructor', canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
  ],
  messages: [
    {
      id: 'msg_1',
      threadId: 'thread_1',
      senderId: 'user_admin',
      body: 'Hello Jane',
      triggerId: null,
      readAt: null,
      sentAt: '2026-04-24T10:00:00.000Z',
    },
    {
      id: 'msg_2',
      threadId: 'thread_1',
      senderId: 'user_instructor',
      body: 'Hi there!',
      triggerId: null,
      readAt: '2026-04-24T10:01:00.000Z',
      sentAt: '2026-04-24T10:01:00.000Z',
    },
  ],
}

const announcementThread = {
  threadId: 'thread_2',
  type: 'ANNOUNCEMENT' as const,
  classId: 'class_1',
  participants: [
    { userId: 'user_instructor', canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
    { userId: 'user_student', canReply: false, user: { firstName: 'Alex', lastName: 'Brown' } },
  ],
  messages: [
    {
      id: 'msg_3',
      threadId: 'thread_2',
      senderId: 'user_instructor',
      body: 'Please bring a mat.',
      triggerId: null,
      readAt: null,
      sentAt: '2026-04-23T09:00:00.000Z',
    },
  ],
}

function renderPage(threadId = 'thread_1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/inbox/${threadId}`]}>
        <Routes>
          <Route path="/inbox" element={<p>Inbox</p>} />
          <Route path="/inbox/:threadId" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ThreadPage', () => {
  const mockReplyMutate = vi.fn()
  const mockAnnounceMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrentUser.mockReturnValue({ data: currentUser, isLoading: false } as never)
    mockUseReplyToThread.mockReturnValue({ mutate: mockReplyMutate, isPending: false } as never)
    mockUseSendAnnouncement.mockReturnValue({ mutate: mockAnnounceMutate, isPending: false } as never)
  })

  it('shows messages in order for a DIRECT thread', () => {
    mockUseThread.mockReturnValue({ data: directThread, isLoading: false } as never)

    renderPage()

    expect(screen.getByText('Hello Jane')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows the reply form for a DIRECT thread when canReply is true', () => {
    mockUseThread.mockReturnValue({ data: directThread, isLoading: false } as never)

    renderPage()

    expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument()
  })

  it('submits a reply to a DIRECT thread', async () => {
    mockUseThread.mockReturnValue({ data: directThread, isLoading: false } as never)
    const user = userEvent.setup()

    renderPage()

    await user.type(screen.getByPlaceholderText(/write a reply/i), 'My reply')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(mockReplyMutate).toHaveBeenCalledWith('My reply', expect.any(Object))
  })

  it('shows announcement messages as cards for an ANNOUNCEMENT thread', () => {
    mockUseCurrentUser.mockReturnValue({
      data: { ...currentUser, id: 'user_instructor' },
      isLoading: false,
    } as never)
    mockUseThread.mockReturnValue({ data: announcementThread, isLoading: false } as never)

    renderPage('thread_2')

    expect(screen.getByText('Please bring a mat.')).toBeInTheDocument()
  })

  it('shows follow-up form for instructor in an ANNOUNCEMENT thread', () => {
    mockUseCurrentUser.mockReturnValue({
      data: { ...currentUser, id: 'user_instructor' },
      isLoading: false,
    } as never)
    mockUseThread.mockReturnValue({ data: announcementThread, isLoading: false } as never)

    renderPage('thread_2')

    expect(screen.getByPlaceholderText(/send another announcement/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send announcement/i })).toBeInTheDocument()
  })

  it('submits a follow-up via POST /announcements for an ANNOUNCEMENT thread', async () => {
    mockUseCurrentUser.mockReturnValue({
      data: { ...currentUser, id: 'user_instructor' },
      isLoading: false,
    } as never)
    mockUseThread.mockReturnValue({ data: announcementThread, isLoading: false } as never)
    const user = userEvent.setup()

    renderPage('thread_2')

    await user.type(screen.getByPlaceholderText(/send another announcement/i), 'Follow-up message')
    await user.click(screen.getByRole('button', { name: /send announcement/i }))

    expect(mockAnnounceMutate).toHaveBeenCalledWith(
      { classId: 'class_1', body: 'Follow-up message' },
      expect.any(Object)
    )
    expect(mockReplyMutate).not.toHaveBeenCalled()
  })

  it('shows read-only notice for student in an ANNOUNCEMENT thread', () => {
    mockUseCurrentUser.mockReturnValue({
      data: { ...currentUser, id: 'user_student' },
      isLoading: false,
    } as never)
    mockUseThread.mockReturnValue({ data: announcementThread, isLoading: false } as never)

    renderPage('thread_2')

    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
