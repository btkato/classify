import { Link } from 'react-router-dom'
import { Users, CalendarDays, CreditCard, LayoutList, Tag } from 'lucide-react'
import { useClasses } from '../hooks/useClasses'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { useAdminMemberships } from '../hooks/useAdminMemberships'
import { Skeleton } from '../components/ui/skeleton'

interface StatCardProps {
  label: string
  value: number | undefined
  caption: string
  isLoading: boolean
}

function StatCard({ label, value, caption, isLoading }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-2 h-9 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-bold">{value ?? '—'}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}

const quickLinks = [
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/classes', icon: CalendarDays, label: 'Classes' },
  { to: '/admin/lesson-sets', icon: LayoutList, label: 'Lesson Sets' },
  { to: '/admin/categories', icon: Tag, label: 'Categories' },
  { to: '/admin/memberships', icon: CreditCard, label: 'Memberships' },
]

export default function AdminDashboard() {
  const { data: classesData, isLoading: classesLoading } = useClasses()
  const { data: usersData, isLoading: usersLoading } = useAdminUsers({ pageSize: 1 })
  const { data: membershipsData, isLoading: membershipsLoading } = useAdminMemberships({ pageSize: 1, status: 'ACTIVE' })

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Users"
          value={usersData?.total}
          caption="All registered accounts"
          isLoading={usersLoading}
        />
        <StatCard
          label="Active Classes"
          value={classesData?.total}
          caption="Upcoming scheduled sessions"
          isLoading={classesLoading}
        />
        <StatCard
          label="Active Memberships"
          value={membershipsData?.total}
          caption="Currently active memberships"
          isLoading={membershipsLoading}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold">Manage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {quickLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
              <span className="ml-auto text-xs text-muted-foreground">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
