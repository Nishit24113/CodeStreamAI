'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'

interface WorkerStats {
  active_workers: number
  active_tasks: Record<string, number>
  registered_tasks: string[]
  queues: Record<string, number>
  error?: string
  message?: string
}

export default function WorkersPage() {
  return (
    <ProtectedRoute>
      <WorkersContent />
    </ProtectedRoute>
  )
}

function WorkersContent() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState<WorkerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/tasks/workers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch worker stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    if (autoRefresh) {
      const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-2xl font-bold text-white hover:text-blue-400">
              CodeStream AI
            </Link>
            <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">Workers</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
            <Link href="/editor" className="text-gray-300 hover:text-white">Editor</Link>
            <Link href="/search" className="text-gray-300 hover:text-white">Search</Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Worker Dashboard ⚙️</h1>
            <p className="text-gray-400 text-lg">Monitor Celery workers and task queues</p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg transition ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>

            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading worker stats...</p>
          </div>
        ) : stats?.error ? (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Workers Not Running</h2>
            <p className="text-red-200">{stats.message}</p>
            <div className="mt-6 bg-gray-800 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-300 mb-2 font-semibold">To start workers, run:</p>
              <code className="text-sm text-green-400 block bg-gray-900 p-3 rounded">
                cd apps/api<br/>
                celery -A app.celery_app worker --loglevel=info --concurrency=5
              </code>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-400">Active Workers</h3>
                  <div className="text-2xl">👷</div>
                </div>
                <p className="text-4xl font-bold text-white">{stats?.active_workers || 0}</p>
                <p className={`text-sm mt-2 ${stats?.active_workers ? 'text-green-400' : 'text-red-400'}`}>
                  {stats?.active_workers ? 'Online' : 'Offline'}
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-400">Analysis Queue</h3>
                  <div className="text-2xl">📊</div>
                </div>
                <p className="text-4xl font-bold text-white">{stats?.queues?.analysis || 0}</p>
                <p className="text-sm text-gray-400 mt-2">Pending tasks</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-400">Security Queue</h3>
                  <div className="text-2xl">🔒</div>
                </div>
                <p className="text-4xl font-bold text-white">{stats?.queues?.security || 0}</p>
                <p className="text-sm text-gray-400 mt-2">Pending tasks</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-400">Indexing Queue</h3>
                  <div className="text-2xl">🔍</div>
                </div>
                <p className="text-4xl font-bold text-white">{stats?.queues?.indexing || 0}</p>
                <p className="text-sm text-gray-400 mt-2">Pending tasks</p>
              </div>
            </div>

            {/* Active Tasks */}
            {stats?.active_tasks && Object.keys(stats.active_tasks).length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Active Tasks by Worker</h2>
                <div className="space-y-3">
                  {Object.entries(stats.active_tasks).map(([worker, count]) => (
                    <div key={worker} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{worker}</p>
                        <p className="text-sm text-gray-400">Worker ID</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                          {count} active
                        </span>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered Tasks */}
            {stats?.registered_tasks && stats.registered_tasks.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Registered Tasks ({stats.registered_tasks.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.registered_tasks.map((task) => (
                    <div key={task} className="bg-gray-700 p-3 rounded-lg">
                      <p className="text-sm text-gray-300 font-mono truncate">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flower Link */}
            <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Advanced Monitoring</h3>
              <p className="text-blue-100 mb-4">
                For real-time task monitoring, use Flower dashboard
              </p>
              <a
                href="http://localhost:5555"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Open Flower Dashboard →
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
