import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminNotificationJobsPage from './AdminNotificationJobsPage'

vi.mock('../hooks/useNotificationJobs', () => ({
  useNotificationJobs: vi.fn(),
}))
vi.mock('../hooks/useNotificationTriggers', () => ({
  useNotificationTriggers: vi.fn(),
}))

import { useNotificationJobs } from '../hooks/useNotificationJobs'
import { useNotificationTriggers } from '../hooks/useNotificationTriggers'

const mockUseNotificationJobs = vi.mocked(useNotificationJobs)
const mockUseNotificationTriggers = vi.mocked(useNotificationTriggers)

const triggers = [
  {
    id: 'trig_1',
    name: 'Welcome after purchase',
    triggerEvent: 'AFTER_PURCHASE',
    offsetDays: 0,
    messageTemplate: 'Hi {student}!',
    isActive: true,
    createdByUserId: 'admin_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'trig_2',
    name: 'Membership expiring soon',
    triggerEvent: 'MEMBERSHIP_EXPIRING',
    offsetDays: 7,
    messageTemplate: 'Renew now!',
    isActive: true,
    createdByUserId: 'admin_1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

const jobs = [
  {
    id: 'job_1',
    userId: 'user_1',
    membershipId: null,
    triggerId: 'trig_1',
    status: 'SENT',
    triggerAt: '2026-04-20T09:00:00.000Z',
    sentAt: '2026-04-20T09:01:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    trigger: { name: 'Welcome after purchase' },
    user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  },
  {
    id: 'job_2',
    userId: 'user_2',
    membershipId: 'mem_1',
    triggerId: 'trig_2',
    status: 'PENDING',
    triggerAt: '2026-04-28T09:00:00.000Z',
    sentAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    trigger: { name: 'Membership expiring soon' },
    user: { firstName: 'Alex', lastName: 'Rivera', email: 'alex@example.com' },
  },
]

const defaultPageData = { data: jobs, total: 2, page: 1, totalPages: 1 }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/notification-jobs']}>
        <Routes>
          <Route path="/admin/notification-jobs" element={<AdminNotificationJobsPage />} />
          <Route path="/admin" element={<p>Admin Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminNotificationJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotificationJobs.mockReturnValue({ isLoading: false, data: defaultPageData } as never)
    mockUseNotificationTriggers.mockReturnValue({ data: triggers } as never)
  })

  it('shows a skeleton while loading', () => {
    mockUseNotificationJobs.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders trigger names and user emails in the table', () => {
    renderPage()
    expect(screen.getByText('Welcome after purchase')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Membership expiring soon')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
  })

  it('renders status badges for each job', () => {
    renderPage()
    expect(screen.getByText('SENT')).toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  it('shows a dash for sentAt when the job has not been sent', () => {
    renderPage()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('passes status to useNotificationJobs when a status filter button is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Sent' }))
    expect(mockUseNotificationJobs).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SENT' })
    )
  })

  it('resets to page 1 when the status filter changes', async () => {
    mockUseNotificationJobs.mockReturnValue({
      isLoading: false,
      data: { data: jobs, total: 40, page: 2, totalPages: 2 },
    } as never)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pending' }))
    expect(mockUseNotificationJobs).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING', page: 1 })
    )
  })

  it('passes triggerId to useNotificationJobs when a trigger is selected', async () => {
    renderPage()
    await userEvent.click(screen.getByLabelText('Filter by trigger'))
    await userEvent.click(await screen.findByRole('option', { name: 'Welcome after purchase' }))
    await waitFor(() =>
      expect(mockUseNotificationJobs).toHaveBeenCalledWith(
        expect.objectContaining({ triggerId: 'trig_1' })
      )
    )
  })

  it('shows pagination when there are multiple pages', () => {
    mockUseNotificationJobs.mockReturnValue({
      isLoading: false,
      data: { data: jobs, total: 40, page: 1, totalPages: 2 },
    } as never)
    renderPage()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('increments the page when Next is clicked', async () => {
    mockUseNotificationJobs.mockReturnValue({
      isLoading: false,
      data: { data: jobs, total: 40, page: 1, totalPages: 2 },
    } as never)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(mockUseNotificationJobs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    )
  })

  it('disables the Previous button on page 1', () => {
    mockUseNotificationJobs.mockReturnValue({
      isLoading: false,
      data: { data: jobs, total: 40, page: 1, totalPages: 2 },
    } as never)
    renderPage()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })
})
