import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { Skeleton } from './ui/skeleton'
import { useSocket } from '../hooks/useSocket'

function PageSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </main>
  )
}

export default function Layout() {
  useSocket()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
