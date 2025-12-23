# Customer Experience AI Agent

A full-stack AI-powered customer support platform that automates support workflows end-to-end. The system uses an intelligent agent to classify customer intents, build execution plans, search a knowledge base, and generate contextual responses—all with optional human-in-the-loop approval for sensitive actions like ticket creation and Gmail draft generation.

---

## ✨ Features

### Employer Portal
- **Support Inbox**: Unified interface for managing all customer conversations with real-time message history
- **AI Reply Generation**: OpenAI-powered contextual responses with fallback to mock replies
- **Agent Planning**: Intent classification with confidence scores + multi-step execution plans
- **Tool Audit Log**: Full transparency into each tool execution with VIEW modal for inputs/outputs
- **Knowledge Base Search**: Keyword-based KB search with "Sources used" citations in replies
- **Human Approval Mode**: Review AI drafts before sending; approve, edit, or cancel
- **Ticket Management**: Create tickets via agent WRITE tools, view/close tickets in dedicated UI with global ticket view across all customers
- **Gmail Draft Integration**: Optionally create Gmail drafts for approved replies (OAuth 2.0 authenticated)
- **Success Dashboard**: Monitor customer health scores, engagement metrics, and support analytics
- **Activity Panel**: View execution plans, audit logs, and AI decision-making process in real-time

### Customer Portal (Guest Mode)
- **Ticket Status**: View all support tickets with real-time status updates (Open, In Progress, Closed)
- **Customer Chat**: Send messages to support team and receive AI-powered responses in real-time
- **Message History**: Access complete conversation history linked to specific tickets
- **Guest Mode**: Access full functionality without authentication (demo mode using fixed customer ID)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  • Next.js 16 (App Router) + React 19 + TypeScript              │
│  • Tailwind CSS 4 with dark theme                              │
│  • Employer Portal: Activity, Tickets, Customers, KB, Settings  │
│  • Customer Portal: Tickets, Chat, Knowledge Base             │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                        │
│  • Async Python with SQLAlchemy ORM                             │
│  • Agent orchestrator (intent → plan → execute)                 │
│  • OpenAI integration for AI replies                            │
│  • Knowledge base indexing & search                            │
│  • Gmail OAuth 2.0 + Draft API integration                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (SQLite)                          │
│  • Customers, Messages, Tickets, Events                        │
│  • Agent Runs + Audit Logs                                     │
│  • Gmail Tokens (OAuth credentials)                             │
│  • Auto-migration for schema changes                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key (optional—mock mode works without it)
- Google Cloud Project with OAuth credentials (optional—for Gmail integration)

### Backend Setup

```cmd
cd backend

:: Create virtual environment
python -m venv .venv
.venv\Scripts\activate

:: Install dependencies
pip install -r requirements.txt

:: Configure environment
:: Create .env file with:
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
GMAIL_ENABLED=true
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/gmail/callback
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.compose,openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/userinfo.profile

:: Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```cmd
cd frontend

:: Install dependencies
npm install

:: Configure environment (optional)
:: Create .env.local with:
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000

:: Start dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No* | OpenAI API key for AI-generated replies |
| `OPENAI_MODEL` | No | Model to use (default: `gpt-4o-mini`) |
| `GMAIL_ENABLED` | No | Enable Gmail integration (default: `false`) |
| `GOOGLE_CLIENT_ID` | Yes (if Gmail enabled) | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes (if Gmail enabled) | Google OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Yes (if Gmail enabled) | OAuth redirect URI (default: `http://127.0.0.1:8000/api/gmail/callback`) |
| `GOOGLE_OAUTH_SCOPES` | No | OAuth scopes (default includes Gmail compose + userinfo) |

*If not set, the system uses mock replies—great for demos without API costs.

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE` | `http://127.0.0.1:8000` | Backend API URL |

---

## 📧 Gmail OAuth Setup

To enable Gmail draft creation:

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Gmail API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URIs: `http://127.0.0.1:8000/api/gmail/callback`
   - Copy the Client ID and Client Secret

4. **Configure Backend**
   - Add credentials to `backend/.env`:
     ```
     GMAIL_ENABLED=true
     GOOGLE_CLIENT_ID=your_client_id_here
     GOOGLE_CLIENT_SECRET=your_client_secret_here
     GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/gmail/callback
     ```

5. **Connect in UI**
   - Start backend and frontend
   - Go to Employer Portal > Settings tab
   - Click "Connect Gmail" button
   - Complete OAuth flow
   - Status will show "Connected as your-email@gmail.com"

---

## 🎬 How to Test Main Flows

### 1. Seed Demo Data
- Open http://localhost:3000
- Click "Employer Dashboard" or "Customer Dashboard"
- If no data exists, click **"Seed Demo Data"** button
- 5 demo customers with sample messages/tickets are created

### 2. Employer Portal - Knowledge Base Search + AI Reply
- Go to **Employer Dashboard** > **Customers** tab
- Select **Alice Johnson**
- Type: `What are your pricing plans and do you have a student discount?`
- Press **Send**
- ✅ **Observe:**
  - Agent Activity panel shows intent: "pricing inquiry" with confidence
  - Plan shows: get customer profile → search kb → generate response
  - Reply includes **"Sources used: pricing.md"**
  - Click **VIEW** on "search kb" to see KB results

### 3. Employer Portal - Human Approval + Gmail Draft
- Select **Bob Smith**
- Go to **Settings** tab, connect Gmail (if enabled)
- Go back to **Customers** tab
- Toggle **Human Approval** ON (top right)
- Type: `I'm having trouble integrating your API, getting 401 errors`
- Press **Send**
- ✅ **Observe:**
  - Draft reply appears in amber box (not sent yet)
  - "Proposed Actions" shows pending ticket creation
  - Select "Approve & Create Gmail Draft" option
  - Edit subject if desired
  - Click **"Approve & Create Gmail Draft"**
  - Reply is sent, ticket is created, Gmail draft is created
  - Success message shows draft ID

### 4. Employer Portal - Global Ticket Management
- Go to **Tickets** tab
- Filter by Open/Closed/All
- Click a ticket to view details
- Click **"Close Ticket"** button
- ✅ **Observe:**
  - Ticket moves to Closed tab
  - Status updates in real-time

### 5. Employer Portal - Knowledge Base Search
- Go to **Knowledge Base** tab
- Enter search query (e.g., "pricing")
- Press Enter or click Search
- ✅ **Observe:**
  - Results show source file, heading, snippet, relevance score
  - Click a result to view full content

### 6. Customer Portal - Guest Experience
- Go to **Customer Dashboard** (or click from landing page)
- If empty, click **"Seed Demo Data"**
- ✅ **Tickets Tab:**
  - View all tickets (Open/Closed/All filters)
  - Click ticket to see details
  - View message history for selected ticket
- ✅ **Chat Tab:**
  - Send message to support
  - Receive AI-powered response
  - View full conversation history

---

## 🗄️ Database Schema

### Core Tables
- **customers**: id, name, email, company, created_at
- **messages**: id, customer_id, direction, channel, body, created_at
- **tickets**: id, customer_id, title, description, status, priority, category, created_at, updated_at, closed_at
- **agent_runs**: id, customer_id, intent, confidence, plan_json, final_reply, created_at
- **audit_logs**: id, run_id, tool_name, tool_input_json, tool_output_json, success, created_at
- **gmail_tokens**: id, email, access_token, refresh_token, token_uri, client_id, client_secret, scopes, expiry

---

## 🤖 AI Pipeline Steps

1. **Intent Classification**: Analyze customer message to determine intent (pricing, technical issue, billing, etc.) with confidence score
2. **Customer Profile & History**: Retrieve customer information, past interactions, and conversation history
3. **Open Tickets Check**: Query existing open tickets for the customer to provide context-aware responses
4. **Knowledge Base Search**: Search internal knowledge base for relevant documentation and include sources in response
5. **Draft Response Generation**: Generate contextual reply using OpenAI with all gathered context, formatted for human review
6. **Human Approval & Execution**: Human reviews draft, approves/edits, then system sends message and executes any write actions (create ticket, etc.)

---

## 📁 Project Structure

```
Customer-experience-agent/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI routes
│   │   ├── db/
│   │   │   ├── database.py      # SQLite + migrations
│   │   │   └── models.py        # SQLAlchemy models
│   │   ├── services/
│   │   │   ├── ai.py            # OpenAI integration
│   │   │   ├── orchestrator.py  # Agent planning
│   │   │   ├── tools.py         # READ/WRITE tools
│   │   │   ├── kb.py            # Knowledge base
│   │   │   └── gmail.py         # Gmail OAuth + Draft API
│   │   └── kb/                  # Markdown KB articles
│   ├── requirements.txt
│   └── .env                     # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── about/
│   │   │   │   └── page.tsx     # About page
│   │   │   ├── employer/
│   │   │   │   └── page.tsx     # Employer portal
│   │   │   └── customer/
│   │   │       ├── page.tsx     # Customer portal landing
│   │   │       └── guest/
│   │   │           └── page.tsx # Customer guest portal
│   │   ├── lib/
│   │   │   └── api.ts           # API client
│   │   └── globals.css          # Global styles
│   ├── package.json
│   └── .env.local               # Environment variables (optional)
├── docs/
│   └── screenshots/             # Demo screenshots
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** FastAPI, Python 3.11+, SQLAlchemy (async), aiosqlite
- **Database:** SQLite with automatic migrations
- **AI:** OpenAI GPT-4o-mini (configurable, with mock fallback)
- **Gmail:** Google OAuth 2.0 + Gmail API (draft creation)
- **Styling:** CSS variables for dark theme, responsive design

---

## ⚠️ Known Limitations

- **Authentication**: Login/registration not implemented. Guest mode uses fixed customer ID (ID=2, Bob Smith) for demo purposes.
- **Multi-user**: Currently single-user demo. Gmail tokens stored in database without user association.
- **Production**: Not configured for production deployment. SQLite database, no authentication, no HTTPS.
- **Email Sending**: Gmail integration only creates drafts. No auto-send functionality (by design for safety).

---

## 📄 License

MIT License - feel free to use this project as a portfolio piece or learning resource.

---

## 👤 Author

Built as a demonstration of full-stack AI agent development with modern web technologies, showcasing:
- AI-powered customer support automation
- Human-in-the-loop approval workflows
- Real-time ticket management
- Gmail OAuth integration
- Enterprise-grade UI/UX design
