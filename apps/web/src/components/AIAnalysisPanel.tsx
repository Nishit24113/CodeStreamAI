'use client'

import { useState } from 'react'
import { Sparkles, X, AlertCircle, CheckCircle, Zap, Shield, TrendingUp } from 'lucide-react'

interface AIAnalysisPanelProps {
  code: string
  language: string
  onClose: () => void
}

export function AIAnalysisPanel({ code, language, onClose }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'bugs' | 'security' | 'performance'>('comprehensive')

  const startAnalysis = async () => {
    setAnalysis('')
    setIsStreaming(true)

    try {
      const response = await fetch('http://localhost:8000/api/review/analyze/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          analysis_type: analysisType,
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setIsStreaming(false)
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'token') {
                setAnalysis((prev) => prev + data.content)
              } else if (data.type === 'error') {
                console.error('Stream error:', data.message)
                setIsStreaming(false)
              } else if (data.type === 'done') {
                setIsStreaming(false)
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysis(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsStreaming(false)
    }
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-[500px] bg-gray-800 border-l border-gray-700 shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">AI Code Review</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Analysis Type Selector */}
      <div className="px-6 py-4 border-b border-gray-700">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Analysis Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'comprehensive', label: 'Comprehensive', icon: Sparkles },
            { value: 'bugs', label: 'Bugs', icon: AlertCircle },
            { value: 'security', label: 'Security', icon: Shield },
            { value: 'performance', label: 'Performance', icon: TrendingUp },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setAnalysisType(type.value as any)}
              className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                analysisType === type.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <type.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analyze Button */}
      <div className="px-6 py-4 border-b border-gray-700">
        <button
          onClick={startAnalysis}
          disabled={isStreaming || !code.trim()}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
        >
          {isStreaming ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Analyze Code</span>
            </>
          )}
        </button>
      </div>

      {/* Analysis Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {analysis ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
              {analysis}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Ready to Analyze
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Select an analysis type and click "Analyze Code" to get AI-powered insights
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Powered by AWS Bedrock (Claude 3.5)</span>
          {isStreaming && <span className="text-purple-400">● Streaming...</span>}
        </div>
      </div>
    </div>
  )
}
