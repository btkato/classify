import { Link } from 'react-router-dom'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { useMemberships } from '../hooks/useMemberships'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import type { Membership, RegistrationWithClass } from '../lib/types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isUpcomingThisWeek(reg: RegistrationWithClass): boolean {
  const startsAt = new Date(reg.class.startsAt).getTime()
  const now = Date.now()
  return (
    (reg.status === 'ENROLLED' || reg.status === 'WAITLISTED') &&
    startsAt > now &&
    startsAt <= now + SEVEN_DAYS_MS
  )
}

function formatMembershipType(type: string): string {
  switch (type) {
    case 'MONTHLY': return 'Monthly'
    case 'CONTINUOUS_MONTHLY': return 'Continuous Monthly'
    case 'YEARLY': return 'Yearly'
    case 'DROP_IN': return 'Drop-in'
    case 'CLASS_PACK_5': return 'Class Pack (5)'
    case 'CLASS_PACK_10': return 'Class Pack (10)'
    default: return type
  }
}

function formatMembershipDetail(membership: Membership): string {
  if (membership.classesRemaining !== null) {
    return `${membership.classesRemaining} classes remaining`
  }
  if (membership.expiresAt) {
    const date = new Date(membership.expiresAt).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return `Expires ${date}`
  }
  return ''
}

export default function StudentDashboard() {
  const { data: registrations, isLoading: regsLoading } = useMyRegistrations()
  const { data: memberships, isLoading: memsLoading } = useMemberships()

  const upcomingThisWeek = (registrations ?? []).filter(isUpcomingThisWeek)
  const activeMemberships = (memberships ?? []).filter((m) => m.status === 'ACTIVE')

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming This Week</h2>
          <Link to="/my-registrations" className="text-sm text-muted-foreground hover:text-foreground underline">
            View all
          </Link>
        </div>

        {regsLoading ? (
          <div data-testid="loading-skeleton" className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : upcomingThisWeek.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No classes this week.{' '}
            <Link to="/classes" className="underline text-foreground">
              Browse classes
            </Link>
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {upcomingThisWeek.map((reg) => {
              const date = new Date(reg.class.startsAt).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })

              return (
                <Card key={reg.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{reg.class.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {date} · {reg.class.durationMinutes} min
                        {reg.class.location ? ` · ${reg.class.location}` : ''}
                      </p>
                    </div>
                    <Badge variant={reg.status === 'WAITLISTED' ? 'outline' : 'secondary'}>
                      {reg.status === 'WAITLISTED' ? `Waitlist #${reg.waitlistPosition}` : 'Enrolled'}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Memberships</h2>
          <Link to="/memberships" className="text-sm text-muted-foreground hover:text-foreground underline">
            Manage
          </Link>
        </div>

        {memsLoading ? (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : activeMemberships.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">No active memberships.</p>
            <Button asChild className="mt-3">
              <Link to="/memberships/purchase">Purchase a Membership</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeMemberships.map((membership) => (
              <Card key={membership.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {formatMembershipType(membership.type)}
                    </p>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMembershipDetail(membership)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/classes">Browse Classes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/my-registrations">All Registrations</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/memberships">My Memberships</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
