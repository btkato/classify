import { useState } from 'react'
import { useClasses } from '../hooks/useClasses'
import { useClassCategories } from '../hooks/useClassCategories'
import type { Class } from '../lib/types'

function ClassCard({ cls }: { cls: Class }) {
  const date = new Date(cls.startsAt).toLocaleString()
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">{cls.title}</h2>
      {cls.description && (
        <p className="mt-1 text-sm text-muted-foreground">{cls.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>{date}</span>
        <span>{cls.durationMinutes} min</span>
        {cls.location && <span>{cls.location}</span>}
        <span>Capacity: {cls.capacity}</span>
      </div>
    </div>
  )
}

export default function ClassListPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(undefined)

  const { data: categories } = useClassCategories()
  const { data: classes, isLoading } = useClasses(selectedCategoryId)

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Classes</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategoryId(undefined)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategoryId === undefined
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategoryId === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes?.map((cls) => <ClassCard key={cls.id} cls={cls} />)}
      </div>
    </main>
  )
}
