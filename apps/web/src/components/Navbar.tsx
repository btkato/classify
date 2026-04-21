import { Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'

export default function Navbar() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Classify
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/classes"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Classes
          </Link>

          {isSignedIn ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/my-registrations"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                My Registrations
              </Link>
              <Link
                to="/memberships"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Memberships
              </Link>
              <span className="text-sm font-medium">
                {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}
              </span>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/sign-in">Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
