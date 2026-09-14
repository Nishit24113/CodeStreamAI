'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setLoading(false)
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }

    const data = await response.json()
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)

    // Get user data before redirecting
    try {
      const userResponse = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
        setLoading(false)
        // Small delay to ensure state is set
        setTimeout(() => {
          router.push('/dashboard')
        }, 100)
      } else {
        throw new Error('Failed to get user data')
      }
    } catch (error) {
      console.error('Failed to get user:', error)
      throw error
    }
  }

  const register = async (
    email: string,
    username: string,
    password: string,
    fullName?: string
  ) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        username,
        password,
        full_name: fullName
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Registration failed')
    }

    const data = await response.json()
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)

    // Get user data before redirecting
    try {
      const userResponse = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
        setLoading(false)
        // Small delay to ensure state is set
        setTimeout(() => {
          router.push('/dashboard')
        }, 100)
      } else {
        throw new Error('Failed to get user data after registration')
      }
    } catch (error) {
      console.error('Failed to get user after registration:', error)
      throw error
    }
  }

  const logout = async () => {
    const token = localStorage.getItem('access_token')

    if (token) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    router.push('/login')
  }

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token')

    if (!refresh) {
      throw new Error('No refresh token')
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refresh })
    })

    if (!response.ok) {
      logout()
      throw new Error('Token refresh failed')
    }

    const data = await response.json()
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
