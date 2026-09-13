'use client'

import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">CodeStream AI</h1>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">Dashboard</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Hello, {user?.username}!</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Welcome to CodeStream AI! 🚀</h2>
          <p className="text-blue-100 text-lg">
            Real-time collaborative code review with AI-powered analysis
          </p>
        </div>

        {/* User Info Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Your Profile</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Username</p>
                <p className="text-white">{user?.username}</p>
              </div>
              {user?.full_name && (
                <div>
                  <p className="text-sm text-gray-400">Full Name</p>
                  <p className="text-white">{user.full_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-white">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Account Active</span>
                <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                  {user?.is_active ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Email Verified</span>
                <span className={`px-3 py-1 ${user?.is_verified ? 'bg-green-600' : 'bg-yellow-600'} text-white text-xs rounded-full`}>
                  {user?.is_verified ? 'Yes' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Last Login</span>
                <span className="text-white text-sm">
                  {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Code Reviews</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Sessions</p>
                <p className="text-3xl font-bold text-white">1</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Analysis</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/editor"
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-center"
            >
              <div className="text-2xl mb-2">💻</div>
              <p className="text-white font-medium">Open Editor</p>
            </Link>

            <button className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-center">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-white font-medium">Search Code</p>
            </button>

            <button className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-white font-medium">View Reports</p>
            </button>

            <button className="p-4 bg-orange-600 hover:bg-orange-700 rounded-lg transition text-center">
              <div className="text-2xl mb-2">⚙️</div>
              <p className="text-white font-medium">Settings</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-400">No recent activity</p>
            <p className="text-gray-500 text-sm mt-2">Start by opening the editor and reviewing some code!</p>
            <Link
              href="/editor"
              className="mt-4 inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
