'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { io, Socket } from 'socket.io-client'
import { Code2, Users, Wifi, WifiOff, Play, Save } from 'lucide-react'

// Monaco Editor - dynamic import to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface User {
  id: string
  color: string
  cursor?: { line: number; column: number }
}

export default function EditorPage() {
  const [code, setCode] = useState('// Welcome to CodeStream AI\n// Start typing to see real-time collaboration!\n\nfunction hello() {\n  console.log("Hello, World!");\n}\n\nhello();')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [roomId] = useState(() => 'demo-room-' + Math.random().toString(36).substr(2, 9))
  const editorRef = useRef<any>(null)
  const isRemoteChange = useRef(false)

  // WebSocket connection
  useEffect(() => {
    const socketInstance = io('http://localhost:8000', {
      transports: ['websocket', 'polling'],
    })

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server')
      setConnected(true)
      socketInstance.emit('join_room', { room: roomId })
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
      setConnected(false)
    })

    socketInstance.on('user_joined', (data) => {
      console.log('User joined:', data)
      const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`
      setUsers(prev => [...prev, { id: data.sid, color: userColor }])
    })

    socketInstance.on('code_update', (data) => {
      console.log('Code update received:', data)
      isRemoteChange.current = true
      setCode(data.changes.code)
    })

    socketInstance.on('cursor_update', (data) => {
      console.log('Cursor update:', data)
      setUsers(prev =>
        prev.map(user =>
          user.id === data.sid
            ? { ...user, cursor: data.position }
            : user
        )
      )
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [roomId])

  // Handle code changes
  const handleCodeChange = (value: string | undefined) => {
    if (!value) return

    // If this is a remote change, don't broadcast
    if (isRemoteChange.current) {
      isRemoteChange.current = false
      return
    }

    setCode(value)

    // Broadcast to other users
    if (socket && connected) {
      socket.emit('code_change', {
        room: roomId,
        changes: {
          code: value,
          timestamp: Date.now()
        }
      })
    }
  }

  // Handle cursor position changes
  const handleCursorChange = (position: any) => {
    if (socket && connected && position) {
      socket.emit('cursor_move', {
        room: roomId,
        position: {
          line: position.lineNumber,
          column: position.column
        }
      })
    }
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      handleCursorChange(e.position)
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Code2 className="h-6 w-6 text-purple-400" />
            <h1 className="text-xl font-bold text-white">CodeStream AI Editor</h1>
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-lg">
              {connected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active users */}
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">{users.length + 1} users</span>
              <div className="flex -space-x-2">
                {users.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="h-8 w-8 rounded-full border-2 border-gray-800"
                    style={{ backgroundColor: user.color }}
                    title={`User ${user.id.substring(0, 6)}`}
                  />
                ))}
              </div>
            </div>

            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 transition-colors">
              <Play className="h-4 w-4" />
              <span>Run Code</span>
            </button>

            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors">
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Room Info */}
        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-400">
          <span>Room ID:</span>
          <code className="px-2 py-1 bg-gray-700 rounded text-purple-400">{roomId}</code>
          <button className="text-purple-400 hover:text-purple-300 underline">
            Copy Link
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
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
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
            },
          }}
        />

        {/* Connection Status Overlay */}
        {!connected && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Connecting to server...</h2>
              <p className="text-gray-400">Make sure the FastAPI backend is running on port 8000</p>
              <code className="block mt-4 text-sm text-purple-400">python apps/api/main.py</code>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <span>JavaScript</span>
            <span>•</span>
            <span>UTF-8</span>
            <span>•</span>
            <span>LF</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Ln {editorRef.current?.getPosition()?.lineNumber || 1}, Col {editorRef.current?.getPosition()?.column || 1}</span>
            <span>•</span>
            <span>{code.split('\n').length} lines</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
