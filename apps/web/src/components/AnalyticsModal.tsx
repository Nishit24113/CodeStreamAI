'use client'

import { X, TrendingUp, Users, Code, Clock, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AnalyticsModalProps {
  onClose: () => void
  username: string
}

interface AnalyticsData {
  totalSessions: number
  totalCodeLines: number
  totalExecutions: number
  avgSessionTime: string
  languagesUsed: string[]
  thisWeek: {
    sessions: number
    linesWritten: number
    executions: number
  }
  recentActivity: Array<{
    date: string
    action: string
    room: string
  }>
  totalChatMessages?: number
}

export function AnalyticsModal({ onClose, username }: AnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch real analytics data
    const fetchAnalytics = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/analytics/user/${username}`)

        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        } else {
          // Fallback to mock data if API fails
          setAnalytics({
            totalSessions: 1,
            totalCodeLines: 0,
            totalExecutions: 0,
            avgSessionTime: '5 min',
            languagesUsed: ['JavaScript', 'Python'],
            thisWeek: {
              sessions: 1,
              linesWritten: 0,
              executions: 0
            },
            recentActivity: [
              { date: new Date().toISOString(), action: 'Welcome to CodeStream AI!', room: 'Get started by creating a room' }
            ]
          })
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        // Fallback to mock data
        setAnalytics({
          totalSessions: 1,
          totalCodeLines: 0,
          totalExecutions: 0,
          avgSessionTime: '5 min',
          languagesUsed: ['JavaScript', 'Python'],
          thisWeek: {
            sessions: 1,
            linesWritten: 0,
            executions: 0
          },
          recentActivity: [
            { date: new Date().toISOString(), action: 'Welcome to CodeStream AI!', room: 'Get started by creating a room' }
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [username])

  if (loading || !analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-center">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <span>Analytics Dashboard</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-400">Showing analytics for</p>
          <p className="text-xl font-semibold text-white">{username}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">{analytics.totalSessions}</span>
            </div>
            <p className="text-sm text-gray-400">Total Sessions</p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Code className="h-5 w-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{analytics.totalCodeLines}</span>
            </div>
            <p className="text-sm text-gray-400">Lines of Code</p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">{analytics.totalExecutions}</span>
            </div>
            <p className="text-sm text-gray-400">Code Executions</p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-orange-400" />
              <span className="text-2xl font-bold text-white">{analytics.avgSessionTime}</span>
            </div>
            <p className="text-sm text-gray-400">Avg Session Time</p>
          </div>
        </div>

        {/* This Week Stats */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            <span>This Week</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-400">{analytics.thisWeek.sessions}</p>
              <p className="text-sm text-gray-400">Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{analytics.thisWeek.linesWritten}</p>
              <p className="text-sm text-gray-400">Lines Written</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">{analytics.thisWeek.executions}</p>
              <p className="text-sm text-gray-400">Executions</p>
            </div>
          </div>
        </div>

        {/* Languages Used */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Languages Used</h3>
          <div className="flex flex-wrap gap-2">
            {analytics.languagesUsed.map((lang, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          {analytics.recentActivity.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-600 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-400">Room: {activity.room}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(activity.date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
