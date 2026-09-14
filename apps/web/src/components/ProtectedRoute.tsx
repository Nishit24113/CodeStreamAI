'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [checkedAuth, setCheckedAuth] = useState(false)

  // Mark when we're on client side
  useEffect(() => {
    setIsClient(true)

    // Give extra time for auth to load from localStorage
    const timer = setTimeout(() => {
      setCheckedAuth(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Only redirect after we're sure auth has been checked
  useEffect(() => {
    if (!isClient || !checkedAuth) return

    if (!loading && !user) {
      // Double check localStorage one more time
      const token = localStorage.getItem('access_token')
      if (!token) {
        // No token, redirect to login
        router.push('/login')
      }
    }
  }, [user, loading, router, isClient, checkedAuth])

  // Show loading while checking authentication OR while still mounting
  if (!isClient || loading || !checkedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If we have a token in localStorage but user hasn't loaded yet, show loading
  if (!user && localStorage.getItem('access_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Authenticating...</p>
        </div>
      </div>
    )
  }

  // No user and no token, will redirect
  if (!user) {
    return null
  }

  return <>{children}</>
}
