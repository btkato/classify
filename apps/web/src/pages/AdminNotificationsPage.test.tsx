import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminNotificationsPage from './AdminNotificationsPage'

vi.mock('../hooks/useNotificationTriggers', () => ({
  useNotificationTriggers: vi.fn(),
}))
vi.mock('../hooks/useCreateNotificationTrigger', () => ({
  useCreateNotificationTrigger: vi.fn(),
}))
vi.mock('../hooks/useUpdateNotificationTrigger', () => ({
  useUpdateNotificationTrigger: vi.fn(),
}))
vi.mock('../hooks/useDeleteNotificationTrigger', () => ({
  useDeleteNotificationTrigger: vi.fn(),
}))
vi.mock('../hooks/useTriggerEventConfigs', () => ({
  useTriggerEventConfigs: vi.fn(),
}))

import { useNotificationTriggers } from '../hooks/useNotificationTriggers'
import { useCreateNotificationTrigger } from '../hooks/useCreateNotificationTrigger'
import { useUpdateNotificationTrigger } from '../hooks/useUpdateNotificationTrigger'
import { useDeleteNotificationTrigger } from '../hooks/useDeleteNotificationTrigger'
import { useTriggerEventConfigs } from '../hooks/useTriggerEventConfigs'

const mockUseNotificationTriggers = vi.mocked(useNotificationTriggers)
const mockUseCreateNotificationTrigger = vi.mocked(useCreateNotificationTrigger)
const mockUseUpdateNotificationTrigger = vi.mocked(useUpdateNotificationTrigger)
const mockUseDeleteNotificationTrigger = vi.mocked(useDeleteNotificationTrigger)
const mockUseTriggerEventConfigs = vi.mocked(useTriggerEventConfigs)

const triggers = [
  {
    id: 'trig_1',
    name: 'Welcome after purchase',
    triggerEvent: 'AFTER_PURCHASE',
    offsetDays: 0,
    threshold: null,
    messageTemplate: 'Hi {student}, thanks for joining {studio}!',
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
    threshold: null,
    messageTemplate: 'Hi {student}, your membership expires in {days} days.',
    isActive: false,
    createdByUserId: 'admin_1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/notifications']}>
        <Routes>
          <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
          <Route path="/admin" element={<p>Admin Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminNotificationsPage', () => {
  const mockCreateMutate = vi.fn()
  const mockUpdateMutate = vi.fn()
  const mockDeleteMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotificationTriggers.mockReturnValue({ isLoading: false, data: triggers } as never)
    mockUseCreateNotificationTrigger.mockReturnValue({ mutate: mockCreateMutate, isPending: false } as never)
    mockUseUpdateNotificationTrigger.mockReturnValue({ mutate: mockUpdateMutate, isPending: false } as never)
    mockUseDeleteNotificationTrigger.mockReturnValue({ mutate: mockDeleteMutate, isPending: false } as never)
    mockUseTriggerEventConfigs.mockReturnValue({
      data: [
        { event: 'AFTER_PURCHASE', displayName: 'After purchase' },
        { event: 'MEMBERSHIP_EXPIRING', displayName: 'Membership expiring' },
        { event: 'MEMBERSHIP_EXPIRED', displayName: 'Membership expired' },
        { event: 'MEMBERSHIP_EXHAUSTED', displayName: 'Membership exhausted' },
        { event: 'AFTER_CLASS_ATTENDED', displayName: 'After class attended' },
        { event: 'CLASS_COUNT_REACHED', displayName: 'Class count reached' },
        { event: 'DAYS_INACTIVE', displayName: 'Days inactive' },
        { event: 'STUDENT_LESSON_COUNT_REACHED', displayName: 'Student lesson count reached' },
        { event: 'CLASS_SERIES_NEARING_END', displayName: 'Class series nearing end' },
        { event: 'CLASS_SERIES_COMPLETE', displayName: 'Class series complete' },
      ],
    } as never)
  })

  it('shows a skeleton while loading', () => {
    mockUseNotificationTriggers.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders trigger names and event labels in the table', () => {
    renderPage()
    expect(screen.getByText('Welcome after purchase')).toBeInTheDocument()
    expect(screen.getByText('After purchase')).toBeInTheDocument()
    expect(screen.getByText('Membership expiring soon')).toBeInTheDocument()
    expect(screen.getByText('Membership expiring')).toBeInTheDocument()
  })

  it('shows Active badge for active triggers and Inactive badge for inactive ones', () => {
    renderPage()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows offset days in the table', () => {
    renderPage()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('opens the create dialog when New trigger is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /new notification trigger/i })).toBeInTheDocument()
  })

  it('closes the create dialog when Cancel is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls createMutate with form values when the create form is submitted', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }))

    await userEvent.type(screen.getByLabelText('Name'), 'Test trigger')

    await userEvent.click(screen.getByLabelText('Trigger event'))
    await userEvent.click(await screen.findByRole('option', { name: 'After purchase' }))

    await userEvent.clear(screen.getByLabelText('Offset days'))
    await userEvent.type(screen.getByLabelText('Offset days'), '3')

    await userEvent.type(screen.getByLabelText('Message template'), 'Hello {{student}!')

    await userEvent.click(screen.getByRole('button', { name: 'Create trigger' }))

    await waitFor(() =>
      expect(mockCreateMutate).toHaveBeenCalledWith(
        {
          name: 'Test trigger',
          triggerEvent: 'AFTER_PURCHASE',
          offsetDays: 3,
          threshold: null,
          messageTemplate: 'Hello {student}!',
          isActive: true,
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('opens the edit dialog pre-filled when Edit is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('edit-trig_1'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /edit trigger/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Welcome after purchase')
    expect(screen.getByLabelText('Offset days')).toHaveValue(0)
  })

  it('calls updateMutate when the edit form is submitted', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('edit-trig_1'))

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Updated name')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'trig_1', name: 'Updated name' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('calls updateMutate with isActive false when Disable is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('toggle-trig_1'))
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 'trig_1', isActive: false },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('calls updateMutate with isActive true when Enable is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('toggle-trig_2'))
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 'trig_2', isActive: true },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('opens the delete confirmation dialog when Delete is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-trig_1'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /delete trigger/i })).toBeInTheDocument()
  })

  it('calls deleteMutate with the trigger id when deletion is confirmed', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-trig_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete trigger' }))
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      'trig_1',
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('closes the delete dialog when Cancel is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-trig_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show the threshold field when the event is not STUDENT_LESSON_COUNT_REACHED', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }))

    await userEvent.click(screen.getByLabelText('Trigger event'))
    await userEvent.click(await screen.findByRole('option', { name: 'After purchase' }))

    expect(screen.queryByLabelText('Attendance threshold')).not.toBeInTheDocument()
  })

  it('shows the threshold field when STUDENT_LESSON_COUNT_REACHED is selected', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }))

    await userEvent.click(screen.getByLabelText('Trigger event'))
    await userEvent.click(await screen.findByRole('option', { name: 'Student lesson count reached' }))

    expect(screen.getByLabelText('Attendance threshold')).toBeInTheDocument()
  })

  it('passes threshold value when STUDENT_LESSON_COUNT_REACHED trigger is submitted', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'New trigger' }))

    await userEvent.type(screen.getByLabelText('Name'), 'Milestone 10')

    await userEvent.click(screen.getByLabelText('Trigger event'))
    await userEvent.click(await screen.findByRole('option', { name: 'Student lesson count reached' }))

    await userEvent.clear(screen.getByLabelText('Offset days'))
    await userEvent.type(screen.getByLabelText('Offset days'), '0')

    await userEvent.clear(screen.getByLabelText('Attendance threshold'))
    await userEvent.type(screen.getByLabelText('Attendance threshold'), '10')

    await userEvent.type(screen.getByLabelText('Message template'), 'Hi {student}, congrats on 10 classes!')

    await userEvent.click(screen.getByRole('button', { name: 'Create trigger' }))

    await waitFor(() =>
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: 'STUDENT_LESSON_COUNT_REACHED',
          threshold: 10,
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('pre-fills threshold when editing a STUDENT_LESSON_COUNT_REACHED trigger', async () => {
    const triggerWithThreshold = {
      id: 'trig_3',
      name: 'Milestone 10',
      triggerEvent: 'STUDENT_LESSON_COUNT_REACHED',
      offsetDays: 0,
      threshold: 10,
      messageTemplate: 'Congrats on 10 classes!',
      isActive: true,
      createdByUserId: 'admin_1',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    }
    mockUseNotificationTriggers.mockReturnValue({ isLoading: false, data: [triggerWithThreshold] } as never)

    renderPage()
    await userEvent.click(screen.getByTestId('edit-trig_3'))

    expect(screen.getByLabelText('Attendance threshold')).toHaveValue(10)
  })
})
