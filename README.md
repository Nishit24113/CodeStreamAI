# 🚀 CodeStream AI - Distributed Real-Time Code Review Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Celery](https://img.shields.io/badge/Celery-5.4-green)](https://docs.celeryproject.org/)

A production-grade, distributed code review platform with real-time collaboration, AI-powered analysis, semantic search, and automated security scanning.

---

## ✨ Features

### 🤖 AI-Powered Analysis
- **Streaming AI Reviews**: Real-time code analysis with AWS Bedrock Claude 3.5 Sonnet
- **RAG Pipeline**: Context-aware reviews using similar code patterns
- **4 Analysis Types**: Comprehensive, Bugs, Security, Performance
- **Server-Sent Events**: Token-by-token streaming with <100ms latency

### 🔍 Semantic Code Search
- **Vector Database**: Pinecone with 384-dimensional embeddings
- **Natural Language**: Search by description or code similarity
- **Instant Results**: <100ms query latency for 10K+ snippets
- **Smart Filters**: Language, similarity threshold, top-K results

### 👥 Real-Time Collaboration
- **WebSocket Sync**: Multi-user code editing with cursor tracking
- **Monaco Editor**: VS Code engine for professional editing
- **Room-Based**: Isolated collaboration spaces

### ⚙️ Distributed Workers
- **5 Worker Pools**: Parallel processing with Celery + RabbitMQ
- **Static Analysis**: Python (pylint, flake8), JavaScript (eslint)
- **Security Scanning**: Bandit, XSS detection, secret scanning
- **Queue Management**: Analysis, security, indexing queues

### 🔐 Enterprise Security
- **JWT Authentication**: Access + refresh tokens with bcrypt
- **PostgreSQL**: Async database with user sessions
- **Protected Routes**: Role-based access control
- **Secret Detection**: Automated API key/password scanning

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (Vercel)                      │
│  Next.js 15 + React 19 + Monaco Editor + WebSocket Client   │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ HTTPS / WebSocket
                 │
┌────────────────▼─────────────────────────────────────────────┐
│                  Backend (AWS Lambda + API Gateway)          │
│  FastAPI + Python + Socket.IO + JWT + SSE Streaming         │
└────────┬───────┬────────┬────────┬─────────┬────────────────┘
         │       │        │        │         │
    ┌────▼──┐ ┌──▼───┐ ┌─▼────┐ ┌─▼─────┐ ┌▼────────┐
    │  RDS  │ │Redis │ │ S3   │ │RabbitMQ│ │ Pinecone│
    │ (DB)  │ │(Cache)│ │(Logs)│ │ (Queue)│ │(Vectors)│
    └───────┘ └──────┘ └──────┘ └────┬───┘ └─────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   Celery Workers      │
                          │  (ECS Fargate x5)     │
                          │ Analysis │ Security   │
                          │ Indexing │ Monitoring │
                          └───────────────────────┘
```

---

## 📚 Documentation

- [Deployment Guide](deploy/README.md)
- API Reference: http://localhost:8000/docs

---

**Built with ❤️ by Nishit Patel**
