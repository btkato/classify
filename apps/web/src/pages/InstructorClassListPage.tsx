import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstructorClasses } from '../hooks/useInstructorClasses'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import type { Class } from '../lib/types'

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const

function formatDate(startsAt: string) {
  return new Date(startsAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ClassCard({ classDetail }: { classDetail: Class & { enrolledCount?: number } }) {
  return (
    <Link
      to={`/instructor/classes/${classDetail.id}`}
      className="block border border-border rounded-lg p-4 hover:border-foreground/30 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">{classDetail.title}</p>
        <Badge variant="secondary">{classDetail.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDate(classDetail.startsAt)} · {classDetail.durationMinutes} min
        {classDetail.location ? ` · ${classDetail.location}` : ''}
      </p>
      {classDetail.enrolledCount !== undefined && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {classDetail.enrolledCount} / {classDetail.capacity} enrolled
        </p>
      )}
    </Link>
  )
}

export default function InstructorClassListPage() {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data: classesPage, isLoading } = useInstructorClasses({
    status: selectedStatus,
    page,
  })

  function handleStatusChange(status: string | undefined) {
    setSelectedStatus(status)
    setPage(1)
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-3xl" data-testid="loading-skeleton">
        <Link to="/instructor" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/instructor" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Dashboard
      </Link>

      <h1 className="mt-6 text-2xl font-bold">My Classes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All classes assigned to you. Click a class to update its details or view the roster.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={selectedStatus === filter.value ? 'default' : 'secondary'}
            size="sm"
            className="rounded-full"
            onClick={() => handleStatusChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {classesPage?.data.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No classes match this filter.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {classesPage?.data.map((classDetail) => (
            <ClassCard key={classDetail.id} classDetail={classDetail} />
          ))}
        </div>
      )}

      {classesPage && classesPage.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {classesPage.page} of {classesPage.totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === classesPage.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
