import Link from 'next/link'
import { Code2, Zap, Clock, CheckCircle, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const recentReviews = [
    {
      id: 1,
      title: 'Authentication refactor',
      language: 'TypeScript',
      status: 'completed',
      time: '2 hours ago',
      score: 92,
    },
    {
      id: 2,
      title: 'API endpoint optimization',
      language: 'Python',
      status: 'in-progress',
      time: '5 hours ago',
      score: null,
    },
    {
      id: 3,
      title: 'Database migration script',
      language: 'SQL',
      status: 'completed',
      time: '1 day ago',
      score: 88,
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome back! Here's your code review activity.</p>
          </div>
          <Link
            href="/editor"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Code2 className="h-5 w-5" />
            <span>New Review</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Reviews', value: '127', icon: Code2, color: 'purple' },
            { label: 'Avg Score', value: '89%', icon: CheckCircle, color: 'green' },
            { label: 'This Week', value: '23', icon: Zap, color: 'yellow' },
            { label: 'Avg Time', value: '12m', icon: Clock, color: 'blue' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`h-10 w-10 text-${stat.color}-400`} />
                <span className={`text-3xl font-bold text-${stat.color}-400`}>
                  {stat.value}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">{stat.label}</h3>
            </div>
          ))}
        </div>

        {/* Recent Reviews */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">Recent Reviews</h2>
          </div>

          <div className="divide-y divide-white/10">
            {recentReviews.map((review) => (
              <div
                key={review.id}
                className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {review.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Code2 className="h-4 w-4" />
                        <span>{review.language}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{review.time}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {review.score && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {review.score}
                        </div>
                        <div className="text-xs text-gray-400">Score</div>
                      </div>
                    )}

                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        review.status === 'completed'
                          ? 'bg-green-400/20 text-green-400'
                          : 'bg-yellow-400/20 text-yellow-400'
                      }`}
                    >
                      {review.status === 'completed' ? 'Completed' : 'In Progress'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-white/10">
            <Link
              href="/reviews"
              className="text-purple-400 hover:text-purple-300 font-medium flex items-center space-x-2"
            >
              <span>View all reviews</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/editor"
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-105"
          >
            <Code2 className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Start New Review</h3>
            <p className="text-gray-400">
              Open the editor and get AI-powered code feedback
            </p>
          </Link>

          <Link
            href="/search"
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-105"
          >
            <Zap className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Search Code</h3>
            <p className="text-gray-400">
              Semantic search across your codebase with AI
            </p>
          </Link>

          <Link
            href="/docs"
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-105"
          >
            <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Documentation</h3>
            <p className="text-gray-400">
              Learn how to use CodeStream AI effectively
            </p>
          </Link>
        </div>
      </div>
    </main>
  )
}
