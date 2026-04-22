import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClassCategories } from '../hooks/useClassCategories'
import { useCreateCategory } from '../hooks/useCreateCategory'
import { useDeleteCategory } from '../hooks/useDeleteCategory'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
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
import type { ClassCategory } from '../lib/types'

export default function AdminCategoryPage() {
  const { data: categories, isLoading } = useClassCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()

  const [name, setName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState<ClassCategory | null>(null)

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    createCategory.mutate(name.trim(), {
      onSuccess: () => setName(''),
    })
  }

  function handleConfirmDelete() {
    if (!categoryToDelete) return
    deleteCategory.mutate(categoryToDelete.id, {
      onSuccess: () => setCategoryToDelete(null),
    })
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Admin
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Categories</h1>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <Input
          placeholder="New category name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={createCategory.isPending}>
          Add
        </Button>
      </form>

      <div className="mt-8">
        {isLoading ? (
          <div data-testid="loading-skeleton" className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      data-testid={`delete-${category.id}`}
                      onClick={() => setCategoryToDelete(category)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => { if (!open) setCategoryToDelete(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">"{categoryToDelete?.name}"</span>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCategory.isPending}
            >
              Delete category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
