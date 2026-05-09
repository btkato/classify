import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const { mutate: updateProfile, isPending } = useUpdateProfile()

  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [dateOfBirthError, setDateOfBirthError] = useState('')

  const phoneIsMissing = currentUser?.phone === null
  const dateOfBirthIsMissing = currentUser?.dateOfBirth === null

  if (currentUser && !phoneIsMissing && !dateOfBirthIsMissing) {
    return <Navigate to="/dashboard" replace />
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    let valid = true
    setPhoneError('')
    setDateOfBirthError('')

    if (phoneIsMissing && !phone.trim()) {
      setPhoneError('Phone number is required')
      valid = false
    }
    if (dateOfBirthIsMissing && !dateOfBirth) {
      setDateOfBirthError('Date of birth is required')
      valid = false
    }

    if (!valid || !currentUser) return

    updateProfile(
      {
        userId: currentUser.id,
        ...(phoneIsMissing && { phone: phone.trim() }),
        ...(dateOfBirthIsMissing && { dateOfBirth }),
      },
      { onSuccess: () => void navigate('/dashboard', { replace: true }) }
    )
  }

  return (
    <main className="flex min-h-[80vh] items-start justify-center px-4 pt-20">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Complete your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We need a couple more details before you can book classes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-6">
          {phoneIsMissing && (
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>
          )}

          {dateOfBirthIsMissing && (
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              {dateOfBirthError && <p className="text-xs text-destructive">{dateOfBirthError}</p>}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            Save and continue
          </Button>
        </form>
      </div>
    </main>
  )
}
