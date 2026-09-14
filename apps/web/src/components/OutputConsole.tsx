'use client'

import { useState } from 'react'
import { Terminal, X, CheckCircle, XCircle, Clock } from 'lucide-react'

interface ExecutionResult {
  success: boolean
  output: string
  error?: string
  executionTime: number
}

interface OutputConsoleProps {
  result: ExecutionResult | null
  onClose: () => void
}

export function OutputConsole({ result, onClose }: OutputConsoleProps) {
  if (!result) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-2xl z-40" style={{ height: '300px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <h3 className="font-semibold text-white text-sm">Output Console</h3>
          {result.success ? (
            <div className="flex items-center space-x-1 text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span className="text-xs">Success</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-400">
              <XCircle className="h-3 w-3" />
              <span className="text-xs">Error</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-gray-400">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{result.executionTime.toFixed(3)}s</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Output */}
      <div className="p-4 overflow-auto" style={{ height: 'calc(100% - 42px)' }}>
        <pre className={`text-sm font-mono ${result.success ? 'text-green-300' : 'text-red-300'}`}>
          {result.output || result.error}
        </pre>
      </div>
    </div>
  )
}
