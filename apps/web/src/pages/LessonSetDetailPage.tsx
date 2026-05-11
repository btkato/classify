import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useLessonSet } from '../hooks/useLessonSet'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { useEnrollInLessonSet } from '../hooks/useEnrollInLessonSet'
import { useCancelLessonSetRegistration } from '../hooks/useCancelLessonSetRegistration'
import { useEnroll } from '../hooks/useEnroll'
import { useCancelRegistration } from '../hooks/useCancelRegistration'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import type { Class, RegistrationWithClass } from '../lib/types'

interface DropInSessionRowProps {
  session: Class
  myRegistrations: RegistrationWithClass[]
  onEnrollError: (error: Error) => void
}

function DropInSessionRow({ session, myRegistrations, onEnrollError }: DropInSessionRowProps) {
  const { mutate: enroll } = useEnroll(session.id)
  const { mutate: cancelRegistration } = useCancelRegistration()

  const existingRegistration = myRegistrations.find(
    (registration) =>
      registration.classId === session.id &&
      (registration.status === 'ENROLLED' || registration.status === 'WAITLISTED')
  )

  const isFull = session.enrolledCount >= session.capacity

  const startDate = new Date(session.startsAt)
  const endDate = new Date(startDate.getTime() + session.durationMinutes * 60_000)
  const dateLabel = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeLabel = `${startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`

  function renderButton() {
    if (existingRegistration) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            cancelRegistration({ registrationId: existingRegistration.id, classId: session.id })
          }
        >
          Cancel
        </Button>
      )
    }
    if (isFull) {
      return (
        <Button size="sm" variant="outline" disabled>
          Full
        </Button>
      )
    }
    return (
      <Button size="sm" onClick={() => enroll(undefined, { onError: (error: Error) => onEnrollError(error) })}>
        Enroll
      </Button>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-medium">Session {session.sessionNumber}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {dateLabel} · {timeLabel}
          {session.location ? ` · ${session.location}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {session.enrolledCount} / {session.capacity}
        </span>
        {renderButton()}
      </div>
    </div>
  )
}

export default function LessonSetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSignedIn } = useAuth()
  const { data: lessonSet, isLoading } = useLessonSet(id ?? '')
  const { data: myRegistrations } = useMyRegistrations()
  const { mutate: enrollInLessonSet } = useEnrollInLessonSet(id ?? '')
  const { mutate: cancelLessonSetRegistration } = useCancelLessonSetRegistration()

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Link
          to="/classes"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Browse Classes
        </Link>
        <div data-testid="loading-skeleton" className="mx-auto mt-6 max-w-2xl space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-32 w-full" />
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

  const classIds = new Set(lessonSet.classes.map((session) => session.id))
  const isEnrolled = (myRegistrations ?? []).some(
    (registration) =>
      classIds.has(registration.classId) &&
      (registration.status === 'ENROLLED' || registration.status === 'WAITLISTED')
  )

  const enrollmentTypeLabel = lessonSet.enrollmentType === 'FULL_SET' ? 'Full Set' : 'Drop-in'

  const firstSession = lessonSet.classes.at(0)
  const firstSessionDate = firstSession
    ? new Date(firstSession.startsAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  function handleGuestEnroll() {
    navigate('/sign-in', { state: { from: { pathname: location.pathname } } })
  }

  function renderFullSetCta() {
    if (!isSignedIn) {
      return (
        <Button className="w-full" onClick={handleGuestEnroll}>
          Sign in to enroll
        </Button>
      )
    }

    if (isEnrolled) {
      return (
        <>
          <p className="mb-3 text-sm font-medium text-green-700">
            You&apos;re enrolled in this series
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => cancelLessonSetRegistration({ lessonSetId: id ?? '' })}
          >
            Cancel Series Enrollment
          </Button>
        </>
      )
    }

    return (
      <Button className="w-full" onClick={() => enrollInLessonSet(undefined, { onError: (error: Error) => {
        if (error.message.includes('No valid membership')) navigate('/memberships/purchase')
      }})}>
        Enroll in Full Series
      </Button>
    )
  }

  function getSessionStatus(classId: string): string | null {
    const registration = (myRegistrations ?? []).find(
      (r) => r.classId === classId && (r.status === 'ENROLLED' || r.status === 'WAITLISTED')
    )
    return registration?.status ?? null
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link
        to="/classes"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Browse Classes
      </Link>

      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{lessonSet.title}</h1>
          <Badge variant="secondary" className="mt-1 shrink-0">
            {lessonSet.status}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{lessonSet.totalSessions} sessions</span>
          <span>·</span>
          <span>{enrollmentTypeLabel} enrollment</span>
          {firstSessionDate && (
            <>
              <span>·</span>
              <span>Starts {firstSessionDate}</span>
            </>
          )}
        </div>

        {lessonSet.description && (
          <p className="mt-4 text-muted-foreground">{lessonSet.description}</p>
        )}

        {lessonSet.enrollmentType === 'FULL_SET' && (
          <Card className="mt-8">
            <CardContent className="pt-6">{renderFullSetCta()}</CardContent>
          </Card>
        )}

        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sessions
        </h2>

        <div className="divide-y overflow-hidden rounded-xl border">
          {lessonSet.classes.map((session) => {
            if (lessonSet.enrollmentType === 'DROP_IN') {
              return (
                <DropInSessionRow
                  key={session.id}
                  session={session}
                  myRegistrations={myRegistrations ?? []}
                  onEnrollError={(error: Error) => {
                    if (error.message.includes('No valid membership')) navigate('/memberships/purchase')
                  }}
                />
              )
            }

            const startDate = new Date(session.startsAt)
            const endDate = new Date(startDate.getTime() + session.durationMinutes * 60_000)
            const dateLabel = startDate.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const timeLabel = `${startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
            const sessionStatus = getSessionStatus(session.id)

            return (
              <div key={session.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium">Session {session.sessionNumber}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dateLabel} · {timeLabel}
                    {session.location ? ` · ${session.location}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {session.enrolledCount} / {session.capacity}
                  </span>
                  {sessionStatus === 'ENROLLED' && (
                    <Badge variant="secondary" className="text-xs">
                      Enrolled
                    </Badge>
                  )}
                  {sessionStatus === 'WAITLISTED' && (
                    <Badge variant="secondary" className="text-xs">
                      Waitlisted
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
