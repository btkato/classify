import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotificationTriggers } from '../hooks/useNotificationTriggers'
import { useCreateNotificationTrigger } from '../hooks/useCreateNotificationTrigger'
import { useUpdateNotificationTrigger } from '../hooks/useUpdateNotificationTrigger'
import { useDeleteNotificationTrigger } from '../hooks/useDeleteNotificationTrigger'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import type { NotificationTrigger } from '../lib/types'

const TRIGGER_EVENT_OPTIONS = [
  { value: 'AFTER_PURCHASE', label: 'After purchase' },
  { value: 'MEMBERSHIP_EXPIRING', label: 'Membership expiring' },
  { value: 'MEMBERSHIP_EXPIRED', label: 'Membership expired' },
  { value: 'MEMBERSHIP_EXHAUSTED', label: 'Membership exhausted' },
  { value: 'AFTER_CLASS_ATTENDED', label: 'After class attended' },
  { value: 'CLASS_COUNT_REACHED', label: 'Class count reached' },
  { value: 'DAYS_INACTIVE', label: 'Days inactive' },
] as const

function formatTriggerEvent(value: string): string {
  return TRIGGER_EVENT_OPTIONS.find((option) => option.value === value)?.label ?? value
}

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; trigger: NotificationTrigger }
  | { type: 'delete'; trigger: NotificationTrigger }

export default function AdminNotificationsPage() {
  const { data: triggers, isLoading } = useNotificationTriggers()
  const createTrigger = useCreateNotificationTrigger()
  const updateTrigger = useUpdateNotificationTrigger()
  const deleteTrigger = useDeleteNotificationTrigger()

  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })

  const [formName, setFormName] = useState('')
  const [formEvent, setFormEvent] = useState('')
  const [formOffsetDays, setFormOffsetDays] = useState(0)
  const [formTemplate, setFormTemplate] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  function openCreateDialog() {
    setFormName('')
    setFormEvent('')
    setFormOffsetDays(0)
    setFormTemplate('')
    setFormIsActive(true)
    setDialog({ type: 'create' })
  }

  function openEditDialog(trigger: NotificationTrigger) {
    setFormName(trigger.name)
    setFormEvent(trigger.triggerEvent)
    setFormOffsetDays(trigger.offsetDays)
    setFormTemplate(trigger.messageTemplate)
    setFormIsActive(trigger.isActive)
    setDialog({ type: 'edit', trigger })
  }

  function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (dialog.type === 'edit') {
      const triggerId = dialog.trigger.id
      updateTrigger.mutate(
        {
          id: triggerId,
          name: formName,
          triggerEvent: formEvent,
          offsetDays: formOffsetDays,
          messageTemplate: formTemplate,
          isActive: formIsActive,
        },
        { onSuccess: () => setDialog({ type: 'closed' }) }
      )
    } else {
      createTrigger.mutate(
        {
          name: formName,
          triggerEvent: formEvent,
          offsetDays: formOffsetDays,
          messageTemplate: formTemplate,
          isActive: formIsActive,
        },
        { onSuccess: () => setDialog({ type: 'closed' }) }
      )
    }
  }

  function handleToggle(trigger: NotificationTrigger) {
    updateTrigger.mutate(
      { id: trigger.id, isActive: !trigger.isActive },
      { onSuccess: () => undefined }
    )
  }

  function handleConfirmDelete() {
    if (dialog.type !== 'delete') return
    const triggerId = dialog.trigger.id
    deleteTrigger.mutate(triggerId, { onSuccess: () => setDialog({ type: 'closed' }) })
  }

  const isFormOpen = dialog.type === 'create' || dialog.type === 'edit'
  const isDeleteOpen = dialog.type === 'delete'
  const formTitle = dialog.type === 'edit' ? 'Edit trigger' : 'New notification trigger'
  const submitLabel = dialog.type === 'edit' ? 'Save changes' : 'Create trigger'

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Admin
      </Link>

      <div className="mt-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Triggers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rules that fire automated messages to students based on membership and activity events.
          </p>
        </div>
        <Button onClick={openCreateDialog}>New trigger</Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div data-testid="loading-skeleton" className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Offset (days)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {triggers?.map((trigger) => (
                <TableRow key={trigger.id}>
                  <TableCell className="font-medium">{trigger.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTriggerEvent(trigger.triggerEvent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{trigger.offsetDays}</TableCell>
                  <TableCell>
                    {trigger.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`edit-${trigger.id}`}
                        onClick={() => openEditDialog(trigger)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`toggle-${trigger.id}`}
                        onClick={() => handleToggle(trigger)}
                      >
                        {trigger.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        data-testid={`delete-${trigger.id}`}
                        onClick={() => setDialog({ type: 'delete', trigger })}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formTitle}</DialogTitle>
            <DialogDescription>
              Define the event and message template for this rule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="e.g. Welcome after purchase"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="triggerEvent">Trigger event</Label>
              <Select value={formEvent} onValueChange={setFormEvent} required>
                <SelectTrigger id="triggerEvent" className="mt-1">
                  <SelectValue placeholder="Select an event…" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="offsetDays">Offset days</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Positive = days after event. Negative = days before event.
              </p>
              <Input
                id="offsetDays"
                type="number"
                value={formOffsetDays}
                onChange={(event) => setFormOffsetDays(Number(event.target.value))}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="messageTemplate">Message template</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Placeholders: <code className="font-mono">{'{student}'}</code>,{' '}
                <code className="font-mono">{'{studio}'}</code>,{' '}
                <code className="font-mono">{'{remaining}'}</code>,{' '}
                <code className="font-mono">{'{days}'}</code>
              </p>
              <Textarea
                id="messageTemplate"
                value={formTemplate}
                onChange={(event) => setFormTemplate(event.target.value)}
                placeholder="Hi {student}, thanks for joining {studio}!"
                className="mt-1 resize-none"
                rows={4}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formIsActive}
                onChange={(event) => setFormIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isActive">Active immediately</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog({ type: 'closed' })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTrigger.isPending || updateTrigger.isPending}
              >
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => { if (!open) setDialog({ type: 'closed' }) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete trigger</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                "{dialog.type === 'delete' ? dialog.trigger.name : ''}"
              </span>
              ? Associated notification jobs will remain in the history log. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ type: 'closed' })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteTrigger.isPending}
            >
              Delete trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
