import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useSocket() {
  const queryClient = useQueryClient()
  const { isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isSignedIn) return

    const socket = io(API_BASE, {
      auth: (callback: (data: { token: string }) => void) => {
        void getToken().then((token) => callback({ token: token ?? '' }))
      },
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
  }, [isSignedIn, getToken, queryClient])
}
