"""
Gmail Integration Service

Handles OAuth 2.0 flow and Gmail draft creation.
"""
import os
import json
import base64
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from typing import Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from itsdangerous import URLSafeTimedSerializer

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import GmailToken


# OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/gmail/callback")
TOKEN_SECRET_KEY = os.getenv("TOKEN_SECRET_KEY", "default-secret-key-change-me")
GMAIL_ENABLED = os.getenv("GMAIL_ENABLED", "false").lower() == "true"

# Required scopes: Gmail compose + userinfo for email retrieval
DEFAULT_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.compose",
]
# Allow override but ensure minimum required scopes
_env_scopes = os.getenv("GOOGLE_OAUTH_SCOPES", "")
GOOGLE_OAUTH_SCOPES = _env_scopes.split(",") if _env_scopes else DEFAULT_SCOPES


def is_gmail_enabled() -> bool:
    """Check if Gmail integration is enabled and configured."""
    return GMAIL_ENABLED and bool(GOOGLE_CLIENT_ID) and bool(GOOGLE_CLIENT_SECRET)


def get_serializer() -> URLSafeTimedSerializer:
    """Get serializer for OAuth state signing."""
    return URLSafeTimedSerializer(TOKEN_SECRET_KEY)


def get_oauth_flow() -> Flow:
    """Create and return OAuth flow object."""
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_OAUTH_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    return flow


def generate_auth_url() -> dict:
    """
    Generate the Google OAuth authorization URL.
    
    Returns:
        dict with 'url' key containing the authorization URL
    """
    if not is_gmail_enabled():
        raise ValueError("Gmail integration is not enabled. Set GMAIL_ENABLED=true and configure OAuth credentials.")
    
    flow = get_oauth_flow()
    
    # Generate state for CSRF protection
    serializer = get_serializer()
    state = serializer.dumps({"purpose": "gmail_oauth"})
    
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    
    return {"url": auth_url, "state": state}


async def exchange_code_for_tokens(code: str, state: str, db: AsyncSession) -> dict:
    """
    Exchange authorization code for tokens and store them.
    
    Args:
        code: Authorization code from Google
        state: State parameter for CSRF validation
        db: Database session
        
    Returns:
        dict with email and status
    """
    if not is_gmail_enabled():
        raise ValueError("Gmail integration is not enabled.")
    
    # Validate state
    serializer = get_serializer()
    try:
        data = serializer.loads(state, max_age=600)  # 10 minutes max
        if data.get("purpose") != "gmail_oauth":
            raise ValueError("Invalid state purpose")
    except Exception as e:
        raise ValueError(f"Invalid or expired state: {str(e)}")
    
    # Exchange code for tokens
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # Validate access token exists
    if not credentials or not credentials.token:
        raise ValueError("Failed to obtain access token from Google OAuth. Please try again.")
    
    # Get user email using authorized credentials
    try:
        service = build("oauth2", "v2", credentials=credentials)
        user_info = service.userinfo().get().execute()
        email = user_info.get("email", "")
        
        if not email:
            raise ValueError("Could not retrieve email from Google account.")
    except HttpError as e:
        error_content = e.content.decode() if e.content else str(e)
        raise ValueError(f"Failed to get user info from Google: {error_content}")
    
    # Check if token already exists
    result = await db.execute(select(GmailToken).where(GmailToken.email == email))
    existing_token = result.scalar_one_or_none()
    
    if existing_token:
        # Update existing token
        existing_token.access_token = credentials.token
        existing_token.refresh_token = credentials.refresh_token or existing_token.refresh_token
        existing_token.token_uri = credentials.token_uri
        existing_token.client_id = credentials.client_id
        existing_token.client_secret = credentials.client_secret
        existing_token.scopes = json.dumps(list(credentials.scopes) if credentials.scopes else [])
        existing_token.expiry = credentials.expiry
        existing_token.updated_at = datetime.utcnow()
    else:
        # Create new token
        new_token = GmailToken(
            email=email,
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_uri=credentials.token_uri,
            client_id=credentials.client_id,
            client_secret=credentials.client_secret,
            scopes=json.dumps(list(credentials.scopes) if credentials.scopes else []),
            expiry=credentials.expiry,
        )
        db.add(new_token)
    
    await db.commit()
    
    return {"email": email, "connected": True}


async def get_gmail_status(db: AsyncSession) -> dict:
    """
    Get current Gmail connection status.
    
    Args:
        db: Database session
        
    Returns:
        dict with connected status and email if connected
    """
    if not is_gmail_enabled():
        return {"connected": False, "enabled": False, "message": "Gmail integration is not enabled"}
    
    result = await db.execute(select(GmailToken).limit(1))
    token = result.scalar_one_or_none()
    
    if token:
        return {
            "connected": True,
            "enabled": True,
            "email": token.email,
        }
    
    return {"connected": False, "enabled": True}


async def get_credentials(db: AsyncSession) -> Optional[Credentials]:
    """
    Get valid Gmail credentials, refreshing if necessary.
    
    Args:
        db: Database session
        
    Returns:
        Credentials object or None if not connected
    """
    result = await db.execute(select(GmailToken).limit(1))
    token = result.scalar_one_or_none()
    
    if not token:
        return None
    
    credentials = Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri=token.token_uri,
        client_id=token.client_id,
        client_secret=token.client_secret,
        scopes=json.loads(token.scopes) if token.scopes else [],
    )
    
    # Check if token is expired and refresh if needed
    if credentials.expired and credentials.refresh_token:
        try:
            from google.auth.transport.requests import Request
            credentials.refresh(Request())
            
            # Update stored token
            token.access_token = credentials.token
            token.expiry = credentials.expiry
            token.updated_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return None
    
    return credentials


def create_message(to: str, subject: str, body: str, from_email: str = "") -> dict:
    """
    Create a message for an email.
    
    Args:
        to: Recipient email address
        subject: Email subject
        body: Email body text
        from_email: Sender email (optional, will use authenticated user)
        
    Returns:
        dict with 'raw' key containing base64url encoded message
    """
    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    if from_email:
        message["from"] = from_email
    
    # Encode in base64url format
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    return {"raw": raw}


async def create_gmail_draft(
    to_email: str,
    subject: str,
    body_text: str,
    db: AsyncSession,
) -> dict:
    """
    Create a Gmail draft.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body_text: Email body text
        db: Database session
        
    Returns:
        dict with draft_id and message_id
        
    Raises:
        ValueError: If Gmail is not connected or draft creation fails
    """
    credentials = await get_credentials(db)
    
    if not credentials:
        raise ValueError("Gmail is not connected. Please connect your Gmail account first.")
    
    try:
        # Build Gmail service
        service = build("gmail", "v1", credentials=credentials)
        
        # Create the message
        message = create_message(to_email, subject, body_text)
        
        # Create draft
        draft = service.users().drafts().create(
            userId="me",
            body={"message": message}
        ).execute()
        
        return {
            "draft_id": draft.get("id"),
            "message_id": draft.get("message", {}).get("id"),
            "success": True,
        }
        
    except HttpError as e:
        error_details = json.loads(e.content.decode()) if e.content else {}
        error_message = error_details.get("error", {}).get("message", str(e))
        raise ValueError(f"Failed to create Gmail draft: {error_message}")
    except Exception as e:
        raise ValueError(f"Failed to create Gmail draft: {str(e)}")


async def disconnect_gmail(db: AsyncSession) -> dict:
    """
    Disconnect Gmail by removing stored tokens.
    
    Args:
        db: Database session
        
    Returns:
        dict with status
    """
    result = await db.execute(select(GmailToken))
    tokens = result.scalars().all()
    
    for token in tokens:
        await db.delete(token)
    
    await db.commit()
    
    return {"disconnected": True}


def generate_email_subject(intent: str, customer_name: str = "") -> str:
    """
    Generate a default email subject based on intent.
    
    Args:
        intent: The classified intent of the conversation
        customer_name: Customer name for personalization
        
    Returns:
        Generated subject line
    """
    intent_subjects = {
        "pricing_inquiry": "Re: Pricing Information Request",
        "billing_issue": "Re: Billing Support",
        "technical_issue": "Re: Technical Support Request",
        "integration_help": "Re: Integration Assistance",
        "general_question": "Re: Your Support Request",
        "feature_request": "Re: Feature Request Received",
        "account_issue": "Re: Account Support",
        "cancellation_request": "Re: Account Update Request",
    }
    
    base_subject = intent_subjects.get(intent, "Re: Support Request")
    
    if customer_name:
        return f"{base_subject} - {customer_name}"
    
    return base_subject

