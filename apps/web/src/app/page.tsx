import Link from 'next/link'
import { ArrowRight, Code2, Zap, Users, Globe, Shield, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <nav className="flex justify-between items-center mb-20">
          <div className="flex items-center space-x-2">
            <Code2 className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">CodeStream AI</span>
          </div>
          <Link
            href="/register"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Get Started
          </Link>
        </nav>

        <div className="text-center max-w-5xl mx-auto">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Real-Time Code Review
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Distributed architecture. Streaming AI responses. WebSocket collaboration.
            Built with cutting-edge technologies for maximum performance.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/editor"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all hover:scale-105"
            >
              Try Live Editor
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold backdrop-blur-sm transition-all"
            >
              View Documentation
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { label: '<100ms', desc: 'WebSocket Latency' },
              { label: '50 tok/s', desc: 'AI Streaming' },
              { label: '1000+', desc: 'Concurrent Users' },
              { label: '99.9%', desc: 'Uptime SLA' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <div className="text-3xl font-bold text-purple-400 mb-2">{stat.label}</div>
                <div className="text-sm text-gray-400">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">
          Built with Cutting-Edge Tech
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: 'Real-Time Collaboration',
              desc: 'WebSocket + WebRTC for instant code sync across distributed clients',
              tech: 'Socket.IO, Y.js CRDT'
            },
            {
              icon: Sparkles,
              title: 'Streaming AI Reviews',
              desc: 'Token-by-token AI responses with Server-Sent Events',
              tech: 'AWS Bedrock, Claude 3.5'
            },
            {
              icon: Users,
              title: 'Distributed Workers',
              desc: 'Horizontal scaling with message queues and worker pools',
              tech: 'Celery, RabbitMQ, Redis'
            },
            {
              icon: Globe,
              title: 'Global Edge Network',
              desc: 'Sub-50ms load times worldwide with edge functions',
              tech: 'Vercel Edge, CloudFront'
            },
            {
              icon: Shield,
              title: 'Type-Safe Full-Stack',
              desc: 'End-to-end type safety with zero API mismatches',
              tech: 'tRPC, TypeScript, Zod'
            },
            {
              icon: Code2,
              title: 'Vector Code Search',
              desc: 'Semantic search with embeddings and similarity matching',
              tech: 'Pinecone, Transformers'
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-105">
              <feature.icon className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-300 mb-4">{feature.desc}</p>
              <div className="text-sm text-purple-400 font-mono">{feature.tech}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">
          Modern Tech Stack
        </h2>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6">Frontend</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> Next.js 15 + React 19
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> TypeScript 5.7+ (Strict)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> tRPC v11 (Type-safe APIs)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> Monaco Editor (VS Code)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> WebSocket + WebRTC
              </li>
            </ul>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6">Backend</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> FastAPI + Python 3.12
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> PostgreSQL 16 + Redis 7
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> Celery + RabbitMQ
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> AWS Bedrock (Claude)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">▸</span> Pinecone Vector DB
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="mb-4">Built by Nishit Patel with Next.js 15, FastAPI, and AWS</p>
          <div className="flex gap-6 justify-center">
            <Link href="https://github.com/Nishit24113" className="hover:text-purple-400 transition-colors">
              GitHub
            </Link>
            <Link href="https://linkedin.com/in/nishit-patel241103" className="hover:text-purple-400 transition-colors">
              LinkedIn
            </Link>
            <Link href="/docs" className="hover:text-purple-400 transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
