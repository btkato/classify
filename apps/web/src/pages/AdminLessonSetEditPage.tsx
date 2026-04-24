import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLessonSet } from '../hooks/useLessonSet'
import { useUpdateLessonSet } from '../hooks/useUpdateLessonSet'
import { useDeleteClass } from '../hooks/useDeleteClass'
import { useDeleteLessonSet } from '../hooks/useDeleteLessonSet'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Skeleton } from '../components/ui/skeleton'
import { Separator } from '../components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import type { Class } from '../lib/types'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminLessonSetEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lessonSet, isLoading } = useLessonSet(id ?? '')
  const updateLessonSet = useUpdateLessonSet(id ?? '')
  const deleteClass = useDeleteClass(id ?? '')
  const deleteLessonSet = useDeleteLessonSet()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(lessonSet?.status ?? '')

  const [sessionToDelete, setSessionToDelete] = useState<Class | null>(null)
  const [deleteLessonSetOpen, setDeleteLessonSetOpen] = useState(false)

  useEffect(() => {
    if (lessonSet) {
      setTitle(lessonSet.title)
      setDescription(lessonSet.description ?? '')
      setStatus(lessonSet.status)
    }
  }, [lessonSet])

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-3xl" data-testid="loading-skeleton">
        <Skeleton className="h-4 w-32" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    )
  }

  if (!lessonSet) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Lesson set not found.</p>
      </main>
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    updateLessonSet.mutate(
      {
        title,
        description: description || undefined,
        status: status || undefined,
      },
      { onSuccess: () => navigate('/admin/lesson-sets') }
    )
  }

  function handleDeleteSession() {
    if (!sessionToDelete) return
    deleteClass.mutate(sessionToDelete.id, {
      onSuccess: () => setSessionToDelete(null),
    })
  }

  function handleDeleteLessonSet() {
    deleteLessonSet.mutate(id ?? '', {
      onSuccess: () => navigate('/admin/lesson-sets'),
    })
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/admin/lesson-sets" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Lesson Sets
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Edit Lesson Set</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <Label htmlFor="description">Description</Label>
            <span className="text-muted-foreground text-xs">(optional)</span>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link to="/admin/lesson-sets">Cancel</Link>
          </Button>
          <Button type="submit" disabled={updateLessonSet.isPending}>
            Save changes
          </Button>
        </div>
      </form>

      <Separator className="my-8" />

      <h2 className="text-lg font-semibold">Sessions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit individual session dates and times, or cancel a session.
      </p>

      <div className="mt-4">
        {lessonSet.classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessonSet.classes.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="text-muted-foreground">
                    Session {session.sessionNumber}
                  </TableCell>
                  <TableCell>{formatDateTime(session.startsAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{session.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/classes/${session.id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-session-${session.id}`}
                        onClick={() => setSessionToDelete(session)}
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

      <Separator className="my-8" />

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cancels this lesson set and all its sessions.
          </p>
        </div>
        <Button
          variant="destructive"
          data-testid="delete-lesson-set"
          onClick={() => setDeleteLessonSetOpen(true)}
        >
          Delete lesson set
        </Button>
      </div>

      <Dialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => { if (!open) setSessionToDelete(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel{' '}
              <span className="font-medium text-foreground">
                Session {sessionToDelete?.sessionNumber}
              </span>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={deleteClass.isPending}
            >
              Delete session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteLessonSetOpen} onOpenChange={setDeleteLessonSetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lesson set</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel{' '}
              <span className="font-medium text-foreground">{lessonSet.title}</span> and all its
              sessions? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLessonSetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLessonSet}
              disabled={deleteLessonSet.isPending}
            >
              Delete lesson set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
