import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useInstructorClasses } from '../hooks/useInstructorClasses'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import type { Class } from '../lib/types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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
        {formatDate(classDetail.startsAt)}
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

export default function InstructorDashboard() {
  const [allClassesPage, setAllClassesPage] = useState(1)

  const { from, to } = useMemo(() => {
    const now = new Date()
    return { from: now.toISOString(), to: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString() }
  }, [])

  const { data: upcomingPage, isLoading: upcomingLoading } = useInstructorClasses({ from, to })

  const { data: classesPage, isLoading: classesLoading } = useInstructorClasses({
    page: allClassesPage,
  })

  const upcomingClasses = upcomingPage?.data ?? []
  const allClasses = classesPage?.data ?? []

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Schedule &amp; Classes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your upcoming classes this week and a full view of all your assigned classes.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Upcoming This Week</h2>

        {upcomingLoading ? (
          <div data-testid="loading-skeleton" className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : upcomingClasses.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No classes scheduled this week.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {upcomingClasses.map((classDetail) => (
              <ClassCard key={classDetail.id} classDetail={classDetail} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Classes</h2>
          <Link
            to="/instructor/classes"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            View all
          </Link>
        </div>

        {classesLoading ? (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : allClasses.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">You have no assigned classes.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {allClasses.map((classDetail) => (
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
                disabled={allClassesPage === 1}
                onClick={() => setAllClassesPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={allClassesPage === classesPage.totalPages}
                onClick={() => setAllClassesPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
