# Backend - Customer Experience Agent API

FastAPI backend for the Customer Experience Agent.

## Quick Start (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health` - Health check endpoint, returns `{"status": "ok"}`

## Configuration

Copy `.env.example` to `.env` and fill in the required values:

- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - OpenAI model to use (e.g., gpt-4)
- `OPENAI_EMBED_MODEL` - OpenAI embedding model
- `GMAIL_ENABLED` - Enable Gmail integration (true/false)


“OpenAI enabled: replies generated via OpenAI when OPENAI_API_KEY is set; fallback to mock otherwise.”

“Key stored in backend/.env (not committed).”
