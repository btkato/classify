import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminMemberships } from '../hooks/useAdminMemberships'
import { useUpdateMembership } from '../hooks/useUpdateMembership'
import { useDebounce } from '../hooks/useDebounce'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
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
import type { AdminMembership } from '../lib/types'

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Exhausted', value: 'EXHAUSTED' },
] as const

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
      {status}
    </Badge>
  )
}

export default function AdminMembershipPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [membershipToCancel, setMembershipToCancel] = useState<AdminMembership | null>(null)

  const debouncedSearch = useDebounce(search, 200)

  const { data, isLoading } = useAdminMemberships({
    page,
    pageSize: 20,
    status: statusFilter,
    search: debouncedSearch || undefined,
  })

  const updateMembership = useUpdateMembership(membershipToCancel?.id ?? '')

  function handleStatusFilter(value: string | undefined) {
    setStatusFilter(value)
    setPage(1)
  }

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleConfirmCancel() {
    if (!membershipToCancel) return
    updateMembership.mutate(
      { status: 'CANCELLED' },
      { onSuccess: () => setMembershipToCancel(null) }
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Memberships</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        View and manage all student memberships. Use the status filter to find active, expired, or
        cancelled memberships.
      </p>

      <div className="mt-4">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={statusFilter === filter.value ? 'default' : 'secondary'}
            size="sm"
            className="rounded-full"
            onClick={() => handleStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
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
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell className="font-medium">{membership.user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{membership.type}</TableCell>
                  <TableCell>
                    <StatusBadge status={membership.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {membership.classesRemaining !== null && membership.classesTotal !== null
                      ? `${membership.classesRemaining} / ${membership.classesTotal}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {membership.expiresAt ? formatDate(membership.expiresAt) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {membership.status === 'ACTIVE' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-auto p-0 text-sm"
                        data-testid={`cancel-${membership.id}`}
                        onClick={() => setMembershipToCancel(membership)}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {data.page} of {data.totalPages}</span>
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
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={membershipToCancel !== null}
        onOpenChange={(open) => { if (!open) setMembershipToCancel(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel membership</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this{' '}
              <span className="font-medium text-foreground">{membershipToCancel?.type}</span>{' '}
              membership for{' '}
              <span className="font-medium text-foreground">
                {membershipToCancel?.user.email}
              </span>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembershipToCancel(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={updateMembership.isPending}
            >
              Cancel membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
