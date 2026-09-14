# 🚀 CodeStream AI - Real-Time Collaborative Code Editor

**A production-ready, multi-tenant SaaS platform for collaborative coding built with AWS serverless architecture.**

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange?logo=amazon-aws)](https://aws.amazon.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📺 **Live Demo**

🌐 **Frontend:** https://d3meafwl386jrm.cloudfront.net  
📡 **REST API:** https://2582505qm2.execute-api.us-west-2.amazonaws.com/prod/  
🔌 **WebSocket:** wss://wzz3aahj08.execute-api.us-west-2.amazonaws.com/prod

**Test Credentials:**
- Email: `demo@codestream.ai`
- Password: `Demo123456`

---

## ✨ **Features**

### **Core Functionality**
- ✅ **Real-Time Collaboration** - Multiple users can code together with WebSocket synchronization
- ✅ **Code Execution** - Run Python code directly in the browser (sandboxed AWS Lambda)
- ✅ **Version Control** - Auto-save with full version history and one-click restore
- ✅ **Team Chat** - Built-in chat system for each coding room
- ✅ **AI Code Analysis** - AI-powered code suggestions and improvements
- ✅ **Monaco Editor** - VS Code-quality editing experience with syntax highlighting
- ✅ **Multi-Room Support** - Create unlimited isolated coding rooms
- ✅ **User Authentication** - Secure JWT-based auth with password hashing

### **Technical Highlights**
- 🏗️ **100% Serverless** - No servers to manage, scales automatically
- 🔒 **Secure by Design** - Private S3, CloudFront OAC, JWT tokens, CORS
- 📊 **Worker Monitoring** - Real-time Lambda function statistics
- 🌍 **Global CDN** - CloudFront edge network for low latency worldwide
- 💰 **Cost-Efficient** - ~$12-15/month for 100 active users
- 🚀 **Infrastructure as Code** - Complete AWS CDK deployment

---

## 🏗️ **Architecture**

### **High-Level Overview**

\`\`\`
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Browser   │─────→│  CloudFront  │─────→│   S3 Bucket     │
│  (React 19) │      │     CDN      │      │ (Static Assets) │
└─────────────┘      └──────────────┘      └─────────────────┘
       │                     │
       │              API Requests
       ↓                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  ┌──────────────┐              ┌───────────────────────┐   │
│  │   REST API   │              │   WebSocket API       │   │
│  │  (HTTP/HTTPS)│              │ (Real-time Sync)      │   │
│  └──────────────┘              └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
       │                                    │
       │          Lambda Functions          │
       ↓                                    ↓
┌──────────────────────────────────────────────────────────────┐
│ Auth │ Code Manager │ Code Executor │ Chat │ WebSocket │ ... │
└──────────────────────────────────────────────────────────────┘
       │                                    │
       ↓                                    ↓
┌──────────────────────────────────────────────────────────────┐
│                       DynamoDB Tables                         │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────┐ │
│  │  Users  │  │CodeRooms  │  │   Chat   │  │Connections │ │
│  └─────────┘  └───────────┘  └──────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────┘
\`\`\`

**📖 Full Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)  
**👥 User Flows:** [USER_FLOW.md](USER_FLOW.md)  
**🧪 Test Results:** [PRODUCTION_TEST_RESULTS.md](PRODUCTION_TEST_RESULTS.md)

---

## 🛠️ **Tech Stack**

### **Frontend**
- **Framework:** Next.js 15.3.5 (App Router, Static Export)
- **Language:** TypeScript 5.7.3
- **UI Library:** React 19.0.0
- **Styling:** Tailwind CSS 3.4.17
- **Editor:** Monaco Editor (VS Code engine)
- **Icons:** Lucide React

### **Backend**
- **Compute:** AWS Lambda (Python 3.11, Node.js 20)
- **API:** AWS API Gateway (REST + WebSocket)
- **Database:** Amazon DynamoDB (4 tables)
- **Authentication:** PyJWT 2.8.0
- **Storage:** Amazon S3
- **CDN:** Amazon CloudFront

### **Infrastructure**
- **IaC:** AWS CDK 2.x (TypeScript)
- **Region:** us-west-2

---

## 📦 **Project Structure**

\`\`\`
CodeStreamAI/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # App router pages
│       │   ├── components/     # React components
│       │   ├── context/        # Auth context
│       │   ├── hooks/          # Custom hooks
│       │   └── services/       # API services
│       └── public/             # Static assets
│
├── deploy/
│   ├── cdk/                    # AWS CDK infrastructure
│   │   └── lib/
│   │       └── complete-stack.ts  # Main CDK stack
│   └── lambda/                 # Lambda functions
│       ├── auth_handler.py     # Authentication
│       ├── code_manager.py     # Code save/load
│       ├── code_executor.py    # Execution
│       ├── chat_manager.py     # Chat
│       └── ws_handler.py       # WebSocket
│
├── ARCHITECTURE.md             # Architecture docs
├── USER_FLOW.md                # User flow diagrams
├── PRODUCTION_TEST_RESULTS.md  # Test verification
└── README.md                   # This file
\`\`\`

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- AWS Account with CLI configured
- AWS CDK CLI: \`npm install -g aws-cdk\`

### **Deploy Backend**
\`\`\`bash
cd deploy/cdk
npm install
cdk bootstrap --profile your-profile
cdk deploy --profile your-profile
\`\`\`

### **Deploy Frontend**
\`\`\`bash
cd apps/web
npm install
npm run build
aws s3 sync out/ s3://YOUR-BUCKET --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
\`\`\`

---

## 💰 **Cost Analysis**

**Monthly Cost (100 Active Users): ~$12-15**
- Lambda: ~$5
- DynamoDB: ~$2.50
- API Gateway: ~$3.50
- CloudFront: ~$1
- S3: <$1

**Scalability:** Handles 1000+ concurrent users with auto-scaling

---

## 📊 **Production Readiness: 85%**

### **What's Working ✅**
- Authentication (JWT)
- Code Management (save/load/versions)
- Python Execution
- Workers Monitoring
- WebSocket Infrastructure
- Frontend (Next.js 15)

### **Pending ⚠️**
- JavaScript Execution Routing
- Multi-user Browser Testing

---

## 👨‍💻 **Author**

**Nishit Patel**  
MS in Computer Science | Arizona State University

- 💼 **LinkedIn:** [nishit-patel241103](https://linkedin.com/in/nishit-patel241103)
- 🐙 **GitHub:** [Nishit24113](https://github.com/Nishit24113)
- 📧 **Email:** nishitpatel241103@gmail.com

---

**Built with ❤️ using AWS Serverless Architecture**
