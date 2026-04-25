import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useSocket() {
  const queryClient = useQueryClient()
  const { userId, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isSignedIn || !userId) return

    const socket = io(API_BASE, {
      auth: { userId },
    })

    function handleNewMessage({ threadId }: { threadId: string }) {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
      void queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
    }

    socket.on('new-message', handleNewMessage)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.disconnect()
    }
  }, [isSignedIn, userId, queryClient])
}
