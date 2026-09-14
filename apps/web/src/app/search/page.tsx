'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'

interface SearchResult {
  id: string
  code: string
  language: string
  similarity_score: number
  description: string | null
  tags: string[] | null
  user_id: number
}

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  )
}

function SearchContent() {
  const { user, logout } = useAuth()
  const [queryCode, setQueryCode] = useState('')
  const [queryText, setQueryText] = useState('')
  const [searchMode, setSearchMode] = useState<'code' | 'text'>('code')
  const [language, setLanguage] = useState('python')
  const [topK, setTopK] = useState(10)
  const [minSimilarity, setMinSimilarity] = useState(0.7)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    setError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/search/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query_code: searchMode === 'code' ? queryCode : undefined,
          query_text: searchMode === 'text' ? queryText : undefined,
          language: language || undefined,
          top_k: topK,
          min_similarity: minSimilarity
        })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data)
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-2xl font-bold text-white hover:text-blue-400">
              CodeStream AI
            </Link>
            <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">Search</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
            <Link href="/editor" className="text-gray-300 hover:text-white">Editor</Link>
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Semantic Code Search 🔍</h1>
          <p className="text-gray-400 text-lg">Find similar code using AI-powered vector search</p>
        </div>

        {/* Search Form */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          {/* Search Mode Toggle */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setSearchMode('code')}
              className={`px-4 py-2 rounded-lg transition ${
                searchMode === 'code'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Search by Code
            </button>
            <button
              onClick={() => setSearchMode('text')}
              className={`px-4 py-2 rounded-lg transition ${
                searchMode === 'text'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Search by Description
            </button>
          </div>

          {/* Query Input */}
          {searchMode === 'code' ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Code Query
              </label>
              <textarea
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={8}
                placeholder="Paste code to find similar snippets..."
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Text Query
              </label>
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe what you're looking for..."
              />
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Languages</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Results ({topK})
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Similarity ({(minSimilarity * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minSimilarity * 100}
                onChange={(e) => setMinSimilarity(parseInt(e.target.value) / 100)}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || (!queryCode && !queryText)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : '🔍 Search'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              Results ({results.length})
            </h2>
            {results.map((result, idx) => (
              <div
                key={result.id}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">
                      #{idx + 1}
                    </span>
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                      {result.language}
                    </span>
                    <span className="text-gray-400 text-sm">
                      Similarity: {(result.similarity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {result.description && (
                  <p className="text-gray-300 mb-3">{result.description}</p>
                )}

                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm text-gray-100 font-mono">
                    {result.code}
                  </code>
                </pre>

                {result.tags && result.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && (queryCode || queryText) && (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400">No results found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your query or lowering the minimum similarity threshold
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
