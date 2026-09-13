# CodeStream AI - Real-Time Code Review Platform

A distributed, real-time code collaboration and AI-powered review platform built with cutting-edge technologies.

## 🚀 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router and Server Components
- **React 19** - Latest React with concurrent features
- **TypeScript 5.7+** - Type-safe development
- **TailwindCSS 4** - Utility-first CSS
- **tRPC** - End-to-end type safety
- **Monaco Editor** - VS Code editor component
- **WebSocket** - Real-time bidirectional communication

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and pub/sub
- **Celery** - Distributed task queue
- **RabbitMQ** - Message broker

### AI/ML
- **AWS Bedrock** - Claude 3.5 Sonnet
- **Pinecone** - Vector database
- **LangChain** - LLM orchestration
- **Sentence Transformers** - Code embeddings

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Vercel** - Frontend hosting
- **AWS** - Cloud services
- **Terraform** - Infrastructure as code

## 🏗️ Project Structure

```
codestream-ai/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # FastAPI backend
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/               # Shared TypeScript types
│   └── config/              # Shared configs
├── docker-compose.yml       # Local development
├── turbo.json              # Turborepo config
└── package.json            # Root package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker & Docker Compose
- pnpm 9+

### Installation

```bash
# Install dependencies
pnpm install

# Setup Python backend
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start infrastructure (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d

# Start all services
pnpm dev
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🔥 Key Features

- **Real-Time Collaboration** - Multiple users editing code simultaneously
- **AI Code Review** - Streaming AI-powered code analysis
- **Semantic Search** - Vector-based code search with embeddings
- **Distributed Processing** - Horizontal scaling with worker pools
- **Type-Safe APIs** - End-to-end type safety with tRPC
- **Global Edge Network** - <50ms load times worldwide
- **Distributed Tracing** - Full observability with OpenTelemetry

## 📊 Performance Targets

- WebSocket latency: <100ms
- AI streaming: 50 tokens/sec
- Initial load time: <50ms (edge)
- Code search: <200ms
- Concurrent users: 1000+

## 🛠️ Development

```bash
# Run frontend only
pnpm --filter web dev

# Run backend only
cd apps/api && uvicorn main:app --reload

# Run tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

## 📝 Environment Variables

See `.env.example` files in each app directory.

## 🚢 Deployment

- **Frontend**: Vercel (automatic via GitHub integration)
- **Backend**: AWS ECS / Lambda
- **Database**: AWS RDS PostgreSQL
- **Cache**: AWS ElastiCache Redis
- **Queue**: AWS MQ (RabbitMQ)

## 📧 Author

**Nishit Patel**
- GitHub: [@Nishit24113](https://github.com/Nishit24113)
- LinkedIn: [linkedin.com/in/nishit-patel241103](https://linkedin.com/in/nishit-patel241103)
- Email: nishitpatel24113@gmail.com

---

⭐️ Built with cutting-edge technologies for maximum performance and scalability
