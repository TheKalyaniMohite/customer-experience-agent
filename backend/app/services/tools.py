"""Agent tools for reading customer data and knowledge base."""

import json
import logging
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Customer, Ticket, AuditLog
from app.services.kb import search_kb as kb_search_service

logger = logging.getLogger(__name__)


async def get_customer_profile(
    customer_id: int,
    db: AsyncSession,
    run_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Get customer profile from database.
    
    Returns customer info including name, email, company, created_at.
    """
    tool_input = {"customer_id": customer_id}
    success = True
    output = {}
    
    try:
        result = await db.execute(
            select(Customer).where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        
        if customer:
            output = {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "company": customer.company,
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
            }
        else:
            output = {"error": "Customer not found"}
            success = False
            
    except Exception as e:
        logger.error(f"Error getting customer profile: {e}")
        output = {"error": str(e)}
        success = False
    
    # Log the tool call
    if run_id:
        audit_log = AuditLog(
            run_id=run_id,
            tool_name="get_customer_profile",
            tool_input_json=json.dumps(tool_input),
            tool_output_json=json.dumps(output),
            success=success,
        )
        db.add(audit_log)
    
    return output


async def get_open_tickets(
    customer_id: int,
    db: AsyncSession,
    run_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Get open tickets for a customer.
    
    Returns list of open/in_progress tickets.
    """
    tool_input = {"customer_id": customer_id}
    success = True
    output = {}
    
    try:
        result = await db.execute(
            select(Ticket)
            .where(Ticket.customer_id == customer_id)
            .where(Ticket.status.in_(["open", "in_progress"]))
            .order_by(Ticket.created_at.desc())
        )
        tickets = result.scalars().all()
        
        output = {
            "tickets": [
                {
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "priority": t.priority,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in tickets
            ],
            "count": len(tickets),
        }
        
    except Exception as e:
        logger.error(f"Error getting open tickets: {e}")
        output = {"error": str(e)}
        success = False
    
    # Log the tool call
    if run_id:
        audit_log = AuditLog(
            run_id=run_id,
            tool_name="get_open_tickets",
            tool_input_json=json.dumps(tool_input),
            tool_output_json=json.dumps(output),
            success=success,
        )
        db.add(audit_log)
    
    return output


async def search_kb(
    query: str,
    db: AsyncSession,
    run_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Search knowledge base for relevant articles using the KB service.
    
    Returns top 3 results with source_file, heading, snippet, and score.
    """
    tool_input = {"query": query}
    success = True
    output = {}
    
    try:
        # Use the KB service for searching
        results = kb_search_service(query, top_k=3)
        
        output = {
            "results": results,
            "count": len(results),
            "query": query,
        }
        
    except Exception as e:
        logger.error(f"Error searching KB: {e}")
        output = {"error": str(e)}
        success = False
    
    # Log the tool call
    if run_id:
        audit_log = AuditLog(
            run_id=run_id,
            tool_name="search_kb",
            tool_input_json=json.dumps(tool_input),
            tool_output_json=json.dumps(output),
            success=success,
        )
        db.add(audit_log)
    
    return output


# ============== WRITE TOOLS ==============

async def create_ticket(
    customer_id: int,
    title: str,
    description: str,
    priority: str,
    category: str,
    db: AsyncSession,
    run_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Create a support ticket for a customer.
    
    Args:
        customer_id: Customer ID
        title: Ticket subject/title
        description: Detailed description of the issue
        priority: Priority level (low, medium, high, urgent)
        category: Category (bug, billing, integration, feature, general)
        db: Database session
        run_id: Agent run ID for audit logging
    
    Returns:
        Created ticket info including ID
    """
    tool_input = {
        "customer_id": customer_id,
        "title": title,
        "description": description,
        "priority": priority,
        "category": category,
    }
    success = True
    output = {}
    
    try:
        # Validate priority
        valid_priorities = ["low", "medium", "high", "urgent"]
        if priority not in valid_priorities:
            priority = "medium"
        
        # Create the ticket
        ticket = Ticket(
            customer_id=customer_id,
            title=title,
            description=description,
            status="open",
            priority=priority,
        )
        db.add(ticket)
        await db.flush()
        await db.refresh(ticket)
        
        output = {
            "ticket_id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "category": category,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "message": f"Ticket #{ticket.id} created successfully",
        }
        
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        output = {"error": str(e)}
        success = False
    
    # Log the tool call
    if run_id:
        audit_log = AuditLog(
            run_id=run_id,
            tool_name="create_ticket",
            tool_input_json=json.dumps(tool_input),
            tool_output_json=json.dumps(output),
            success=success,
        )
        db.add(audit_log)
    
    return output


async def execute_write_action(
    action: str,
    params: dict[str, Any],
    db: AsyncSession,
    run_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Execute a write action by name.
    
    Args:
        action: Action name (e.g., "create_ticket")
        params: Parameters for the action
        db: Database session
        run_id: Agent run ID for audit logging
    
    Returns:
        Result of the action
    """
    if action == "create_ticket":
        return await create_ticket(
            customer_id=params.get("customer_id"),
            title=params.get("title", "Support Ticket"),
            description=params.get("description", ""),
            priority=params.get("priority", "medium"),
            category=params.get("category", "general"),
            db=db,
            run_id=run_id,
        )
    elif action == "escalate_to_human":
        # For now, create a high-priority ticket for escalation
        return await create_ticket(
            customer_id=params.get("customer_id"),
            title="ESCALATION: " + params.get("reason", "Customer requested escalation"),
            description=params.get("reason", "Customer requested escalation to human support"),
            priority="urgent",
            category="escalation",
            db=db,
            run_id=run_id,
        )
    else:
        return {"error": f"Unknown write action: {action}"}
