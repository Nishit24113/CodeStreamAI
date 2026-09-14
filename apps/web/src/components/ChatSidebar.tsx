'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'

interface ChatMessage {
  username: string
  message: string
  timestamp: number
  isOwn?: boolean
}

interface ChatSidebarProps {
  roomId: string
  username: string
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  onClose: () => void
}

export function ChatSidebar({ roomId, username, messages, onSendMessage, onClose }: ChatSidebarProps) {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-gray-800 border-l border-gray-700 shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-white">Team Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-xs ${msg.isOwn ? 'text-blue-400' : 'text-gray-400'}`}>
                  {msg.username}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.isOwn
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
