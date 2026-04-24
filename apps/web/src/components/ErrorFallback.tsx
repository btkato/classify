export default function ErrorFallback() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Try again later or contact support if the problem persists.
      </p>
    </main>
  )
}
