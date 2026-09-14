'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Code2, Users, Wifi, WifiOff, Play, Save, Sparkles, MessageCircle, History, Copy, Check, Home, Wand2 } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChatSidebar } from '@/components/ChatSidebar'
import { OutputConsole } from '@/components/OutputConsole'
import { saveCode, loadCode, executeCode, getVersionHistory, type ExecutionResult, type CodeVersion } from '@/services/api'
import { useRouter } from 'next/navigation'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface ChatMessage {
  username: string
  message: string
  timestamp: number
  isOwn?: boolean
}

export default function EditorPage() {
  return (
    <ProtectedRoute>
      <EditorContent />
    </ProtectedRoute>
  )
}

function EditorContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [code, setCode] = useState('// Welcome to CodeStream AI - Multi-User Real-Time Editor\n// Start coding and see changes sync across all users!\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log(fibonacci(10)); // 55')
  const [language, setLanguage] = useState('javascript')
  const [roomId] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('room') || 'demo-room-' + Math.random().toString(36).substr(2, 9)
    }
    return 'demo-room-' + Math.random().toString(36).substr(2, 9)
  })

  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<CodeVersion[]>([])
  const [copied, setCopied] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

  const editorRef = useRef<any>(null)
  const isRemoteChange = useRef(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // WebSocket real-time collaboration
  const {
    connected,
    activeUsers,
    sendCodeChange,
    sendCursorMove,
    sendChatMessage,
  } = useWebSocket({
    roomId,
    username: user?.username || 'Anonymous',
    onCodeUpdate: (newCode, username) => {
      console.log(`Code update from ${username}`)
      isRemoteChange.current = true
      setCode(newCode)
    },
    onChatMessage: (username, message, timestamp) => {
      setChatMessages(prev => [...prev, {
        username,
        message,
        timestamp,
        isOwn: username === user?.username
      }])
    },
    onUserJoined: (username) => {
      console.log(`${username} joined`)
    },
    onUserLeft: (username) => {
      console.log(`${username} left`)
    },
  })

  // Load existing code on mount
  useEffect(() => {
    loadCode(roomId).then(data => {
      if (data && data.code) {
        setCode(data.code)
        setLanguage(data.language || 'javascript')
      }
    }).catch(err => {
      console.error('Failed to load code:', err)
    })
  }, [roomId])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveCode(roomId, code, language, user?.username || 'anonymous').catch(console.error)
    }, 30000) // 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [code, roomId, language, user?.username])

  // Handle code changes
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!value) return

    // If this is a remote change, don't broadcast
    if (isRemoteChange.current) {
      isRemoteChange.current = false
      return
    }

    setCode(value)

    // Broadcast to other users via WebSocket
    if (connected) {
      sendCodeChange(value, language)
    }
  }, [connected, language, sendCodeChange])

  // Handle cursor position changes
  const handleCursorChange = useCallback((position: any) => {
    if (connected && position) {
      sendCursorMove({
        line: position.lineNumber,
        column: position.column
      })
    }
  }, [connected, sendCursorMove])

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      handleCursorChange(e.position)
    })
  }

  // Save code
  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true)

    try {
      await saveCode(roomId, code, language, user?.username || 'anonymous')
      if (!silent) {
        // Show success indicator
        setTimeout(() => setSaving(false), 1000)
      }
    } catch (error) {
      console.error('Failed to save:', error)
      setSaving(false)
    }
  }

  // Run code
  const handleRunCode = async () => {
    setExecuting(true)
    setExecutionResult(null)

    try {
      const result = await executeCode(code, language)
      setExecutionResult(result)
    } catch (error: any) {
      setExecutionResult({
        success: false,
        output: '',
        error: error.message || 'Execution failed',
        executionTime: 0
      })
    } finally {
      setExecuting(false)
    }
  }

  // Copy room link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/editor?room=${roomId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Load version history
  const handleShowVersions = async () => {
    try {
      const history = await getVersionHistory(roomId)
      setVersions(history)
      setShowVersions(true)
    } catch (error) {
      console.error('Failed to load versions:', error)
    }
  }

  // Send chat message
  const handleSendChatMessage = (message: string) => {
    sendChatMessage(message)
    setChatMessages(prev => [...prev, {
      username: user?.username || 'You',
      message,
      timestamp: Date.now(),
      isOwn: true
    }])
  }

  // AI Analyze Code
  const handleAIAnalyze = async () => {
    setAnalyzing(true)
    setAiSuggestion(null)

    try {
      // Simulate AI analysis (in production, call AWS Bedrock/Claude API)
      await new Promise(resolve => setTimeout(resolve, 2000))

      const suggestions = [
        '💡 Consider adding error handling for edge cases like negative numbers or null values',
        '⚡ This recursive function could benefit from memoization to improve performance',
        '🔒 Add input validation to prevent potential security vulnerabilities',
        '📊 Adding type annotations would improve code clarity and catch bugs earlier',
        '♻️ Consider refactoring this into smaller, reusable functions for better maintainability',
        '🎯 This algorithm has O(2^n) complexity - consider using dynamic programming',
        '✨ Great code structure! Consider adding JSDoc comments for better documentation'
      ]

      const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)]
      setAiSuggestion(randomSuggestion)

      // Also show as execution result
      setExecutionResult({
        success: true,
        output: randomSuggestion,
        error: undefined,
        executionTime: 2.0
      })
    } catch (error) {
      console.error('AI Analysis failed:', error)
      setAiSuggestion('❌ AI analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Code2 className="h-6 w-6 text-purple-400" />
            <h1 className="text-xl font-bold text-white">CodeStream AI Editor</h1>

            {/* Connection Status */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded-lg">
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">
                {connected ? 'Connected' : 'Connecting...'}
              </span>
            </div>

            {/* Active Users */}
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">{activeUsers.length + 1} users</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* AI Analyze Button */}
            <button
              onClick={handleAIAnalyze}
              disabled={analyzing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              <span>{analyzing ? 'Analyzing...' : 'AI Analyze'}</span>
            </button>

            {/* Run Code Button */}
            <button
              onClick={handleRunCode}
              disabled={executing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>{executing ? 'Running...' : 'Run Code'}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saved!' : 'Save'}</span>
            </button>

            {/* Version History */}
            <button
              onClick={handleShowVersions}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`px-4 py-2 ${showChat ? 'bg-orange-600' : 'bg-gray-700'} hover:bg-orange-700 text-white rounded-lg flex items-center space-x-2 transition-colors`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
            </button>

            {/* Back to Dashboard */}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Room Info */}
        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-400">
          <span>Room ID:</span>
          <code className="px-2 py-1 bg-gray-700 rounded text-purple-400">{roomId}</code>
          <button
            onClick={handleCopyLink}
            className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <MonacoEditor
          height="100%"
          width="100%"
          defaultLanguage={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            renderWhitespace: 'selection',
            cursorStyle: 'line',
            cursorBlinking: 'smooth',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            renderLineHighlight: 'all',
          }}
        />
      </div>

      {/* Footer / Status Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <span>{language}</span>
            <span>•</span>
            <span>UTF-8</span>
            <span>•</span>
            <span>LF</span>
            {connected && (
              <>
                <span>•</span>
                <span className="text-green-400">Real-time sync active</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Ln {editorRef.current?.getPosition()?.lineNumber || 1},
              Col {editorRef.current?.getPosition()?.column || 1}
            </span>
            <span>•</span>
            <span>{code.split('\n').length} lines</span>
          </div>
        </div>
      </footer>

      {/* Chat Sidebar */}
      {showChat && (
        <ChatSidebar
          roomId={roomId}
          username={user?.username || 'Anonymous'}
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Output Console */}
      {executionResult && (
        <OutputConsole
          result={executionResult}
          onClose={() => setExecutionResult(null)}
        />
      )}

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold text-white mb-4">Version History</h2>
            {versions.length === 0 ? (
              <p className="text-gray-400">No version history yet</p>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.version}
                    className="bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => {
                      // Load this version (you can implement this)
                      setShowVersions(false)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Version {version.version}</span>
                      <span className="text-sm text-gray-400">
                        {new Date(version.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">By: {version.userId}</div>
                    <pre className="text-xs text-gray-300 mt-2 overflow-hidden">{version.codePreview}</pre>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowVersions(false)}
              className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
