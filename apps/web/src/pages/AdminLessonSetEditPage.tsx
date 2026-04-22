import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLessonSet } from '../hooks/useLessonSet'
import { useUpdateLessonSet } from '../hooks/useUpdateLessonSet'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Skeleton } from '../components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

export default function AdminLessonSetEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lessonSet, isLoading } = useLessonSet(id ?? '')
  const updateLessonSet = useUpdateLessonSet(id ?? '')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')

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
          <Label htmlFor="description">Description</Label>
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
              <SelectValue placeholder="Select status" />
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
    </main>
  )
}
