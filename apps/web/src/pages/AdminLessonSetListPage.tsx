import { Link } from 'react-router-dom'
import { useLessonSets } from '../hooks/useLessonSets'
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

function formatEnrollmentType(type: string): string {
  return type === 'FULL_SET' ? 'Full Set' : 'Drop-in'
}

export default function AdminLessonSetListPage() {
  const { data: lessonSets, isLoading } = useLessonSets()

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Admin
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lesson Sets</h1>
        <Button asChild>
          <Link to="/admin/lesson-sets/new">+ New Lesson Set</Link>
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div data-testid="loading-skeleton" className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : lessonSets?.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No lesson sets yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Enrollment Type</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessonSets?.map((lessonSet) => (
                <TableRow key={lessonSet.id}>
                  <TableCell className="font-medium">{lessonSet.title}</TableCell>
                  <TableCell className="text-muted-foreground">{formatEnrollmentType(lessonSet.enrollmentType)}</TableCell>
                  <TableCell className="text-muted-foreground">{lessonSet.totalSessions}</TableCell>
                  <TableCell>
                    <Badge variant={lessonSet.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {lessonSet.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/admin/lesson-sets/${lessonSet.id}`}
                      data-testid={`edit-${lessonSet.id}`}
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
    </main>
  )
}
