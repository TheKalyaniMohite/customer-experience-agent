import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

# Load environment variables FIRST, before any other imports that depend on them
from dotenv import load_dotenv

# Get the backend directory (parent of app/)
_backend_dir = Path(__file__).resolve().parent.parent
_env_path = _backend_dir / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import init_db, get_db
from app.db.models import Customer, Message, Ticket, Event, AgentRun, AuditLog
from app.services.ai import generate_agent_reply_with_context
from app.services.orchestrator import classify_intent, build_plan, execute_plan
from app.services.kb import search_kb as kb_search, get_kb
from app.services.tools import execute_write_action
from app.services.gmail import (
    is_gmail_enabled,
    generate_auth_url,
    exchange_code_for_tokens,
    get_gmail_status,
    create_gmail_draft,
    disconnect_gmail,
    generate_email_subject,
)


class CreateMessageRequest(BaseModel):
    text: str
    requires_approval: bool = False


class ApproveMessageRequest(BaseModel):
    draft_text: str
    action: str = "chat_only"  # "chat_only" or "gmail_draft"
    email_subject: str = ""  # Subject for Gmail draft


class CreateTicketRequest(BaseModel):
    title: str
    description: str
    priority: str = "medium"
    category: str = "general"


class ExecuteWriteActionRequest(BaseModel):
    action: str
    params: dict


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    await init_db()
    # Load knowledge base
    get_kb()
    yield
    # Shutdown (nothing to do)


app = FastAPI(
    title="Customer Experience Agent API",
    description="Backend API for the Customer Experience Agent",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration (demo-safe)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/seed")
async def seed_database(db: AsyncSession = Depends(get_db)):
    """Seed the database with demo data. Idempotent - skips if data exists."""
    # Check if data already exists
    result = await db.execute(select(Customer).limit(1))
    if result.scalar_one_or_none():
        return {"message": "Database already seeded", "seeded": False}

    # Demo customers
    customers_data = [
        {"name": "Alice Johnson", "email": "alice@techcorp.com", "company": "TechCorp Inc."},
        {"name": "Bob Smith", "email": "bob@startup.io", "company": "Startup.io"},
        {"name": "Carol Williams", "email": "carol@enterprise.com", "company": "Enterprise Solutions"},
        {"name": "David Brown", "email": "david@smallbiz.net", "company": "SmallBiz Network"},
        {"name": "Eva Martinez", "email": "eva@globaltech.org", "company": "GlobalTech Organization"},
    ]

    customers = []
    for data in customers_data:
        customer = Customer(**data)
        db.add(customer)
        customers.append(customer)

    await db.flush()  # Get IDs assigned

    # Sample messages
    messages_data = [
        {"customer": customers[0], "direction": "inbound", "channel": "email", "subject": "Question about pricing", "body": "Hi, I'd like to know more about your enterprise pricing plans."},
        {"customer": customers[0], "direction": "outbound", "channel": "email", "subject": "Re: Question about pricing", "body": "Hello Alice, thank you for your interest! Our enterprise plan starts at $99/month."},
        {"customer": customers[1], "direction": "inbound", "channel": "chat", "subject": None, "body": "Is there a free trial available?"},
        {"customer": customers[2], "direction": "inbound", "channel": "email", "subject": "Integration support needed", "body": "We need help integrating your API with our existing systems."},
        {"customer": customers[3], "direction": "inbound", "channel": "email", "subject": "Bug report", "body": "I found a bug in the dashboard - charts are not loading properly."},
    ]

    for data in messages_data:
        customer = data.pop("customer")
        message = Message(customer_id=customer.id, **data)
        db.add(message)

    # Sample tickets
    tickets_data = [
        {"customer": customers[0], "title": "Upgrade to Enterprise Plan", "description": "Customer wants to upgrade from Pro to Enterprise", "status": "open", "priority": "medium"},
        {"customer": customers[2], "title": "API Integration Assistance", "description": "Need technical support for REST API integration", "status": "in_progress", "priority": "high"},
        {"customer": customers[3], "title": "Dashboard Bug Fix", "description": "Charts not loading in analytics dashboard", "status": "open", "priority": "urgent"},
        {"customer": customers[4], "title": "Feature Request: Export", "description": "Request for CSV export functionality", "status": "open", "priority": "low"},
    ]

    for data in tickets_data:
        customer = data.pop("customer")
        ticket = Ticket(customer_id=customer.id, **data)
        db.add(ticket)

    # Sample events
    events_data = [
        {"customer": customers[0], "event_type": "login", "description": "User logged in from new device"},
        {"customer": customers[0], "event_type": "page_view", "description": "Viewed pricing page"},
        {"customer": customers[1], "event_type": "signup", "description": "New user registration"},
        {"customer": customers[2], "event_type": "purchase", "description": "Purchased Enterprise plan"},
        {"customer": customers[3], "event_type": "support_request", "description": "Submitted bug report via dashboard"},
        {"customer": customers[4], "event_type": "login", "description": "Regular login"},
    ]

    for data in events_data:
        customer = data.pop("customer")
        event = Event(customer_id=customer.id, **data)
        db.add(event)

    await db.commit()

    return {
        "message": "Database seeded successfully",
        "seeded": True,
        "counts": {
            "customers": len(customers_data),
            "messages": len(messages_data),
            "tickets": len(tickets_data),
            "events": len(events_data),
        }
    }


@app.get("/api/customers")
async def list_customers(db: AsyncSession = Depends(get_db)):
    """List all customers."""
    result = await db.execute(select(Customer).order_by(Customer.id))
    customers = result.scalars().all()
    return {"customers": [c.to_dict() for c in customers]}


@app.get("/api/customers/{customer_id}/messages")
async def get_customer_messages(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get all messages for a specific customer."""
    result = await db.execute(
        select(Message)
        .where(Message.customer_id == customer_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return {"messages": [m.to_dict() for m in messages]}


@app.post("/api/customers/{customer_id}/messages")
async def create_customer_message(
    customer_id: int,
    request: CreateMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new message for a specific customer and run AI agent."""
    # Verify customer exists
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Save customer message (inbound)
    customer_message = Message(
        customer_id=customer_id,
        direction="inbound",
        channel="chat",
        subject=None,
        body=request.text,
    )
    db.add(customer_message)
    await db.flush()
    await db.refresh(customer_message)

    # Step 1: Classify intent
    intent_result = await classify_intent(request.text)
    intent = intent_result["intent"]
    confidence = intent_result["confidence"]

    # Step 2: Build plan
    plan = build_plan(intent, request.text, customer_id)
    plan_json = json.dumps(plan)

    # Step 3: Create agent run record (to get run_id for audit logs)
    agent_run = AgentRun(
        customer_id=customer_id,
        input_text=request.text,
        intent=intent,
        confidence=confidence,
        plan_json=plan_json,
        final_reply="",  # Will be updated after execution
    )
    db.add(agent_run)
    await db.flush()
    await db.refresh(agent_run)

    # Step 4: Execute plan (READ steps only, skip writes)
    context = await execute_plan(plan, customer_id, db, agent_run.id, skip_writes=True)
    
    # Extract pending writes from context
    pending_writes = context.get("pending_writes", [])

    # Step 5: Generate AI response with context
    agent_reply_text = await generate_agent_reply_with_context(
        customer_name=customer.name,
        customer_message=request.text,
        intent=intent,
        context=context,
        company_name=customer.company,
    )

    # Step 5b: Create audit log for "generate_response" step
    generate_response_input = {
        "customer_id": customer_id,
        "latest_message": request.text,
        "context": {
            "customer_profile": context.get("customer_profile"),
            "kb_results": context.get("kb_results"),
        }
    }
    generate_response_output = {
        "reply_text": agent_reply_text
    }
    generate_response_audit = AuditLog(
        run_id=agent_run.id,
        tool_name="generate_response",
        tool_input_json=json.dumps(generate_response_input),
        tool_output_json=json.dumps(generate_response_output),
        success=True,
    )
    db.add(generate_response_audit)

    # Step 6: Update agent run with final reply
    agent_run.final_reply = agent_reply_text

    # Fetch audit logs for this run (before conditional commit)
    await db.flush()
    audit_logs_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.run_id == agent_run.id)
        .order_by(AuditLog.created_at)
    )
    audit_logs = audit_logs_result.scalars().all()

    # Build agent_run response object
    agent_run_response = {
        "id": agent_run.id,
        "intent": agent_run.intent,
        "confidence": agent_run.confidence,
        "plan_json": agent_run.plan_json,
        "audit_logs": [log.to_dict() for log in audit_logs],
        "pending_writes": pending_writes,
    }

    # If requires_approval, return draft without saving agent message
    if request.requires_approval:
        await db.commit()
        return {
            "status": "pending_approval",
            "customer_message": customer_message.to_dict(),
            "draft_reply": agent_reply_text,
            "agent_run": agent_run_response,
            "pending_writes": pending_writes,
        }
    
    # Otherwise, save agent reply message and return as sent
    agent_message = Message(
        customer_id=customer_id,
        direction="outbound",
        channel="chat",
        subject=None,
        body=agent_reply_text,
    )
    db.add(agent_message)
    
    await db.commit()
    await db.refresh(agent_message)

    return {
        "status": "sent",
        "customer_message": customer_message.to_dict(),
        "agent_message": agent_message.to_dict(),
        "agent_run": agent_run_response,
    }


@app.post("/api/customers/{customer_id}/approve")
async def approve_message(
    customer_id: int,
    request: ApproveMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Approve and send a draft agent message, executing any pending write actions.
    
    Optionally creates a Gmail draft if action="gmail_draft" and Gmail is connected.
    """
    # Verify customer exists
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Save the approved agent message
    agent_message = Message(
        customer_id=customer_id,
        direction="outbound",
        channel="chat",
        subject=None,
        body=request.draft_text,
    )
    db.add(agent_message)
    await db.flush()
    await db.refresh(agent_message)

    # Get the latest agent run to find pending writes
    run_result = await db.execute(
        select(AgentRun)
        .where(AgentRun.customer_id == customer_id)
        .order_by(AgentRun.created_at.desc())
        .limit(1)
    )
    latest_run = run_result.scalar_one_or_none()
    
    executed_actions = []
    
    if latest_run:
        # Parse the plan to find pending write actions
        try:
            plan = json.loads(latest_run.plan_json)
            for step in plan:
                if step.get("type") == "write" and step.get("status") == "pending":
                    action = step.get("action")
                    params = step.get("params", {})
                    
                    # Execute the write action
                    action_result = await execute_write_action(
                        action=action,
                        params=params,
                        db=db,
                        run_id=latest_run.id,
                    )
                    
                    executed_actions.append({
                        "action": action,
                        "step": step.get("step"),
                        "result": action_result,
                    })
        except json.JSONDecodeError:
            pass

    # Handle Gmail draft creation if requested
    gmail_result = None
    if request.action == "gmail_draft":
        if not is_gmail_enabled():
            raise HTTPException(
                status_code=400,
                detail="Gmail integration is not enabled. Set GMAIL_ENABLED=true in .env"
            )
        
        # Check if Gmail is connected
        gmail_status = await get_gmail_status(db)
        if not gmail_status.get("connected"):
            raise HTTPException(
                status_code=400,
                detail="Gmail is not connected. Please connect your Gmail account first."
            )
        
        # Generate subject if not provided
        email_subject = request.email_subject.strip()
        if not email_subject and latest_run:
            email_subject = generate_email_subject(latest_run.intent, customer.name)
        elif not email_subject:
            email_subject = f"Re: Support Request - {customer.name}"
        
        try:
            gmail_result = await create_gmail_draft(
                to_email=customer.email,
                subject=email_subject,
                body_text=request.draft_text,
                db=db,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    await db.commit()

    response = {
        "status": "sent",
        "agent_message": agent_message.to_dict(),
        "executed_actions": executed_actions,
    }
    
    if gmail_result:
        response["gmail"] = gmail_result
    
    return response


@app.get("/api/customers/{customer_id}/tickets")
async def get_customer_tickets(
    customer_id: int,
    status: str = "open",  # Filter: "open", "closed", "all"
    db: AsyncSession = Depends(get_db)
):
    """Get tickets for a specific customer, sorted newest first. Filter by status."""
    # Verify customer exists
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Build query with optional status filter
    query = select(Ticket).where(Ticket.customer_id == customer_id)
    
    if status == "open":
        # Include open and in_progress as "open" tickets
        query = query.where(Ticket.status.in_(["open", "in_progress"]))
    elif status == "closed":
        query = query.where(Ticket.status == "closed")
    # "all" - no additional filter
    
    query = query.order_by(Ticket.created_at.desc())
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    return {
        "tickets": [t.to_dict() for t in tickets],
        "count": len(tickets),
    }


@app.post("/api/customers/{customer_id}/tickets")
async def create_ticket_endpoint(
    customer_id: int,
    request: CreateTicketRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new ticket for a specific customer."""
    # Verify customer exists
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Create the ticket
    ticket = Ticket(
        customer_id=customer_id,
        title=request.title,
        description=request.description,
        status="open",
        priority=request.priority,
        category=request.category,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    
    return {
        "ticket": ticket.to_dict()
    }


@app.post("/api/customers/{customer_id}/tickets/{ticket_id}/close")
async def close_ticket(
    customer_id: int,
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Close a ticket for a specific customer."""
    from datetime import datetime
    
    # Verify customer exists
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Find the ticket
    result = await db.execute(
        select(Ticket)
        .where(Ticket.id == ticket_id)
        .where(Ticket.customer_id == customer_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update ticket status to closed
    ticket.status = "closed"
    ticket.closed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(ticket)
    
    return {
        "ticket": ticket.to_dict()
    }


@app.get("/api/tickets")
async def get_all_tickets(
    status: str = "all",  # Filter: "open", "closed", "all"
    db: AsyncSession = Depends(get_db),
):
    """Get all tickets across all customers, sorted newest first. Filter by status."""
    from sqlalchemy.orm import joinedload
    
    # Build query with optional status filter
    query = select(Ticket).options(joinedload(Ticket.customer))
    
    if status == "open":
        # Include open and in_progress as "open" tickets
        query = query.where(Ticket.status.in_(["open", "in_progress"]))
    elif status == "closed":
        query = query.where(Ticket.status == "closed")
    # "all" - no additional filter
    
    query = query.order_by(Ticket.created_at.desc())
    result = await db.execute(query)
    tickets = result.unique().scalars().all()
    
    # Include customer info in response
    tickets_data = []
    for ticket in tickets:
        ticket_dict = ticket.to_dict()
        if ticket.customer:
            ticket_dict["customer"] = {
                "id": ticket.customer.id,
                "name": ticket.customer.name,
                "email": ticket.customer.email,
                "company": ticket.customer.company,
            }
        tickets_data.append(ticket_dict)
    
    return {
        "tickets": tickets_data,
        "count": len(tickets_data),
    }


@app.post("/api/tickets/{ticket_id}/close")
async def close_ticket_simple(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Close a ticket by ID (simpler endpoint without customer_id)."""
    from datetime import datetime
    
    # Find the ticket
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket with id {ticket_id} not found")
    
    # Update ticket status to closed
    ticket.status = "closed"
    ticket.closed_at = datetime.utcnow()
    ticket.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(ticket)
    
    return {
        "ticket": ticket.to_dict()
    }


@app.post("/api/agent-runs/{run_id}/execute-action")
async def execute_agent_action(
    run_id: int,
    request: ExecuteWriteActionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Execute a write action for a specific agent run and log it."""
    # Verify agent run exists
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
    agent_run = result.scalar_one_or_none()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    
    # Execute the write action
    action_result = await execute_write_action(
        action=request.action,
        params=request.params,
        db=db,
        run_id=run_id,
    )
    
    await db.commit()
    
    return {
        "success": "error" not in action_result,
        "action": request.action,
        "result": action_result,
    }


@app.get("/api/customers/{customer_id}/latest-agent-run")
async def get_latest_agent_run(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get the latest agent run for a customer."""
    result = await db.execute(
        select(AgentRun)
        .where(AgentRun.customer_id == customer_id)
        .order_by(AgentRun.created_at.desc())
        .options(selectinload(AgentRun.audit_logs))
        .limit(1)
    )
    agent_run = result.scalar_one_or_none()
    
    if not agent_run:
        return {"agent_run": None}
    
    return {"agent_run": agent_run.to_dict()}


@app.get("/api/kb/search")
async def search_knowledge_base(q: str = ""):
    """Search the knowledge base for relevant articles."""
    if not q.strip():
        return {"results": [], "query": q}
    
    results = kb_search(q.strip(), top_k=3)
    return {"results": results, "query": q}


# ============================================================================
# Gmail Integration Endpoints
# ============================================================================

@app.get("/api/gmail/status")
async def gmail_status(db: AsyncSession = Depends(get_db)):
    """Get Gmail connection status."""
    status = await get_gmail_status(db)
    return status


@app.get("/api/gmail/auth-url")
async def gmail_auth_url():
    """Get the Google OAuth authorization URL."""
    if not is_gmail_enabled():
        raise HTTPException(
            status_code=400,
            detail="Gmail integration is not enabled. Set GMAIL_ENABLED=true and configure OAuth credentials in .env"
        )
    
    try:
        auth_data = generate_auth_url()
        return auth_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/gmail/callback")
async def gmail_callback(
    code: str = "",
    state: str = "",
    error: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback."""
    from fastapi.responses import HTMLResponse
    
    if error:
        return HTMLResponse(f"""
            <html>
            <head><title>Gmail Connection Error</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h2 style="color: #dc2626;">Connection Failed</h2>
                <p>Error: {error}</p>
                <p>You can close this window.</p>
                <script>
                    setTimeout(function() {{ window.close(); }}, 3000);
                </script>
            </body>
            </html>
        """)
    
    if not code:
        return HTMLResponse("""
            <html>
            <head><title>Gmail Connection Error</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h2 style="color: #dc2626;">Connection Failed</h2>
                <p>No authorization code received.</p>
                <p>You can close this window.</p>
            </body>
            </html>
        """)
    
    try:
        result = await exchange_code_for_tokens(code, state, db)
        email = result.get("email", "your account")
        
        return HTMLResponse(f"""
            <html>
            <head><title>Gmail Connected</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h2 style="color: #10b981;">✓ Gmail Connected</h2>
                <p>Successfully connected to <strong>{email}</strong></p>
                <p>You can close this window and return to the app.</p>
                <script>
                    // Notify opener window if available
                    if (window.opener) {{
                        window.opener.postMessage({{ type: 'gmail_connected', email: '{email}' }}, '*');
                    }}
                    setTimeout(function() {{ window.close(); }}, 2000);
                </script>
            </body>
            </html>
        """)
        
    except ValueError as e:
        return HTMLResponse(f"""
            <html>
            <head><title>Gmail Connection Error</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h2 style="color: #dc2626;">Connection Failed</h2>
                <p>{str(e)}</p>
                <p>You can close this window.</p>
            </body>
            </html>
        """)


@app.post("/api/gmail/disconnect")
async def gmail_disconnect(db: AsyncSession = Depends(get_db)):
    """Disconnect Gmail by removing stored tokens."""
    result = await disconnect_gmail(db)
    return result


@app.post("/api/gmail/create-draft")
async def gmail_create_draft_endpoint(
    to_email: str,
    subject: str,
    body: str,
    db: AsyncSession = Depends(get_db),
):
    """Create a Gmail draft (direct endpoint for testing)."""
    if not is_gmail_enabled():
        raise HTTPException(status_code=400, detail="Gmail integration is not enabled")
    
    try:
        result = await create_gmail_draft(to_email, subject, body, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
