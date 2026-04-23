import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminClasses } from '../hooks/useAdminClasses'
import { useClassCategories } from '../hooks/useClassCategories'
import { Button } from '../components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Completed', value: 'COMPLETED' },
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

export default function AdminClassListPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAdminClasses({ status: statusFilter, categoryId, page, pageSize: 20 })
  const { data: categories } = useClassCategories()

  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]))

  function handleStatusFilter(value: string | undefined) {
    setStatusFilter(value)
    setPage(1)
  }

  function handleCategoryFilter(value: string) {
    setCategoryId(value === 'all' ? undefined : value)
    setPage(1)
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Admin
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Button asChild>
          <Link to="/admin/classes/new">+ New Class</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
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

        <Select onValueChange={handleCategoryFilter} defaultValue="all">
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div data-testid="loading-skeleton" className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No classes found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((classDetail) => (
                <TableRow key={classDetail.id}>
                  <TableCell className="font-medium">{classDetail.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryMap.get(classDetail.categoryId) ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(classDetail.startsAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={classDetail.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {classDetail.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/admin/classes/${classDetail.id}`}
                      data-testid={`edit-${classDetail.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Edit
                    </Link>
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
    </main>
  )
}
