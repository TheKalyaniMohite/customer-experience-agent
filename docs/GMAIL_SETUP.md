# Gmail Integration Setup Guide

This guide explains how to set up Gmail OAuth integration to create email drafts from the Customer Experience Agent.

## Overview

The Gmail integration allows you to:
- Create Gmail drafts from approved agent replies
- Send email drafts to customer email addresses
- Keep a record in both the chat and email systems

**Important**: This integration creates **drafts only** — emails are NOT sent automatically. You must manually send from your Gmail account.

## Prerequisites

1. A Google Cloud Platform account
2. Access to Gmail API
3. Your local development environment running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name (e.g., "CX Agent Gmail")
4. Click **Create**

## Step 2: Enable Gmail API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on **Gmail API**
4. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless using Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: CX Agent
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. Add scopes → Click **Add or Remove Scopes**
7. Search for and add: `https://www.googleapis.com/auth/gmail.compose`
8. Click **Update** → **Save and Continue**
9. Add test users → Add your Gmail address
10. Click **Save and Continue** → **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Enter a name (e.g., "CX Agent Web Client")
5. Under **Authorized redirect URIs**, add:
   ```
   http://127.0.0.1:8000/api/gmail/callback
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

1. Open `backend/.env` (create from `.env.example` if needed)
2. Add your credentials:

```env
# Gmail Integration
GMAIL_ENABLED=true
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/gmail/callback
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.compose

# Security key for OAuth state signing
TOKEN_SECRET_KEY=your-random-secret-key-here
```

**Security Note**: Never commit `.env` files to version control!

## Step 6: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 7: Test the Integration

### Start the Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Start the Frontend

```bash
cd frontend
npm run dev
```

### Connect Gmail

1. Open the app at `http://localhost:3000`
2. Look for the **Connect Gmail** button in the header
3. Click it to start the OAuth flow
4. Sign in with your Google account
5. Grant the requested permissions
6. You should see "Gmail Connected" in the header

### Create a Gmail Draft

1. Turn on **Human Review** mode
2. Send a message to any customer
3. When the draft appears, check **"Also create Gmail draft"**
4. Edit the subject if needed
5. Click **Approve & Create Draft**
6. Check your Gmail Drafts folder!

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gmail/status` | GET | Check if Gmail is connected |
| `/api/gmail/auth-url` | GET | Get OAuth authorization URL |
| `/api/gmail/callback` | GET | Handle OAuth callback |
| `/api/gmail/disconnect` | POST | Disconnect Gmail account |

## Troubleshooting

### "Gmail integration is not enabled"

Make sure `GMAIL_ENABLED=true` is set in your `.env` file.

### "Invalid or expired state"

The OAuth flow took too long. Try connecting again.

### "Token refresh failed"

Your refresh token may have expired. Disconnect and reconnect Gmail.

### "Access blocked: This app's request is invalid"

Make sure your redirect URI exactly matches what's configured in Google Cloud Console:
```
http://127.0.0.1:8000/api/gmail/callback
```

### OAuth consent screen shows app is "unverified"

For testing, click **Advanced** → **Go to [App Name] (unsafe)**. For production, you'll need to verify your app with Google.

## Production Considerations

For production deployment:

1. Use HTTPS for all URLs
2. Update `GOOGLE_REDIRECT_URI` to your production domain
3. Add production domain to authorized redirect URIs in Google Cloud Console
4. Consider verifying your OAuth consent screen
5. Use secure secret management for credentials
6. Implement proper user session management (current implementation is single-user demo)

## Security Notes

- OAuth tokens are stored in the local SQLite database
- Refresh tokens allow automatic token renewal
- The `TOKEN_SECRET_KEY` signs OAuth state to prevent CSRF attacks
- Never expose client secrets in frontend code
- Gmail API access is limited to draft creation (`gmail.compose` scope)

## Files Changed

This feature added/modified the following files:

### Backend
- `backend/requirements.txt` - Added Google OAuth packages
- `backend/.env.example` - Gmail environment variables template
- `backend/app/db/models.py` - Added `GmailToken` model
- `backend/app/services/gmail.py` - Gmail OAuth and draft creation service
- `backend/app/main.py` - Gmail API endpoints and approve endpoint update

### Frontend
- `frontend/src/lib/api.ts` - Gmail API functions
- `frontend/src/app/page.tsx` - Gmail button and draft approval UI

### Documentation
- `docs/GMAIL_SETUP.md` - This file


