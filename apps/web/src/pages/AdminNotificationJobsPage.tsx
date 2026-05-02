import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotificationJobs } from '../hooks/useNotificationJobs'
import { useNotificationTriggers } from '../hooks/useNotificationTriggers'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Label } from '../components/ui/label'
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

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SENT') return <Badge variant="default">{status}</Badge>
  if (status === 'FAILED') return <Badge variant="destructive">{status}</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export default function AdminNotificationJobsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [triggerId, setTriggerId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useNotificationJobs({
    page,
    pageSize: 20,
    status: statusFilter,
    triggerId,
  })

  const { data: triggers } = useNotificationTriggers()

  function handleStatusFilter(value: string | undefined) {
    setStatusFilter(value)
    setPage(1)
  }

  function handleTriggerFilter(value: string) {
    setTriggerId(value === 'all' ? undefined : value)
    setPage(1)
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Notification Job History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Audit log of every automated notification fired by a trigger rule.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.label}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="triggerFilter">Filter by trigger</Label>
          <Select onValueChange={handleTriggerFilter}>
            <SelectTrigger id="triggerFilter" className="w-56">
              <SelectValue placeholder="All triggers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              {triggers?.map((trigger) => (
                <SelectItem key={trigger.id} value={trigger.id}>
                  {trigger.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
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
                <TableHead>Trigger</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled for</TableHead>
                <TableHead>Sent at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.trigger.name}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {job.user.firstName} {job.user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{job.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(job.triggerAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.sentAt ? formatDateTime(job.sentAt) : '—'}
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
              onClick={() => setPage((previous) => previous - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.totalPages}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
