import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClasses } from '../hooks/useClasses'
import { useClassCategories } from '../hooks/useClassCategories'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import type { Class } from '../lib/types'

function ClassCard({ cls }: { cls: Class }) {
  const date = new Date(cls.startsAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Link to={`/classes/${cls.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{cls.title}</CardTitle>
          {cls.description && (
            <CardDescription>{cls.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>{date}</span>
          <span>{cls.durationMinutes} min{cls.location ? ` · ${cls.location}` : ''}</span>
          <span>Capacity: {cls.capacity}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ClassListPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')

  const { data: categories } = useClassCategories()
  const { data: classPage, isFetching } = useClasses({
    categoryId: selectedCategoryId,
    page,
    search: activeSearch || undefined,
  })

  function handleCategoryChange(categoryId: string | undefined) {
    setSelectedCategoryId(categoryId)
    setPage(1)
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActiveSearch(searchInput)
    setPage(1)
  }

  function handleClearSearch() {
    setSearchInput('')
    setActiveSearch('')
    setPage(1)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Classes</h1>

      <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2 max-w-sm">
        <Input
          placeholder="Search classes..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        {activeSearch && (
          <Button type="button" variant="ghost" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={selectedCategoryId === undefined ? 'default' : 'secondary'}
          size="sm"
          className="rounded-full"
          onClick={() => handleCategoryChange(undefined)}
        >
          All
        </Button>
        {categories?.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategoryId === cat.id ? 'default' : 'secondary'}
            size="sm"
            className="rounded-full"
            onClick={() => handleCategoryChange(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {isFetching ? (
        <div data-testid="loading-skeleton" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classPage?.data.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}

      {!isFetching && classPage && classPage.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {classPage.page} of {classPage.totalPages}
          </span>
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
              disabled={page === classPage.totalPages}
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
