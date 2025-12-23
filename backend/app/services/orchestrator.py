"""Agent orchestrator for intent classification and plan building."""

import json
import logging
import os
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.tools import get_customer_profile, get_open_tickets, search_kb

logger = logging.getLogger(__name__)

# Try to import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# Intent categories
INTENTS = [
    "pricing_inquiry",
    "technical_support", 
    "billing_issue",
    "feature_request",
    "bug_report",
    "account_help",
    "integration_help",
    "general_question",
    "escalation_request",
]


def get_openai_client() -> Optional["OpenAI"]:
    """Get OpenAI client if available."""
    if not OPENAI_AVAILABLE:
        return None
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


async def classify_intent(text: str) -> dict[str, Any]:
    """
    Classify the intent of customer message.
    
    Returns: {"intent": str, "confidence": float}
    """
    client = get_openai_client()
    
    if client:
        try:
            model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an intent classifier. Classify the customer message into one of these intents:
{', '.join(INTENTS)}

Respond with JSON only: {{"intent": "<intent>", "confidence": <0.0-1.0>}}"""
                    },
                    {"role": "user", "content": text}
                ],
                max_tokens=100,
                temperature=0.1,
            )
            
            result = response.choices[0].message.content
            if result:
                # Parse JSON response
                data = json.loads(result.strip())
                return {
                    "intent": data.get("intent", "general_question"),
                    "confidence": float(data.get("confidence", 0.5)),
                }
        except Exception as e:
            logger.error(f"OpenAI intent classification error: {e}")
    
    # Fallback: simple keyword-based classification
    text_lower = text.lower()
    
    if any(kw in text_lower for kw in ["price", "pricing", "cost", "plan", "subscription", "trial"]):
        return {"intent": "pricing_inquiry", "confidence": 0.7}
    elif any(kw in text_lower for kw in ["bug", "error", "broken", "not working", "crash", "fix"]):
        return {"intent": "bug_report", "confidence": 0.7}
    elif any(kw in text_lower for kw in ["integrate", "api", "webhook", "connect", "sync"]):
        return {"intent": "integration_help", "confidence": 0.7}
    elif any(kw in text_lower for kw in ["bill", "invoice", "payment", "charge", "refund"]):
        return {"intent": "billing_issue", "confidence": 0.7}
    elif any(kw in text_lower for kw in ["feature", "request", "add", "would like", "suggestion"]):
        return {"intent": "feature_request", "confidence": 0.6}
    elif any(kw in text_lower for kw in ["account", "password", "login", "profile", "settings"]):
        return {"intent": "account_help", "confidence": 0.7}
    elif any(kw in text_lower for kw in ["help", "support", "issue", "problem"]):
        return {"intent": "technical_support", "confidence": 0.6}
    elif any(kw in text_lower for kw in ["manager", "escalate", "supervisor", "complaint"]):
        return {"intent": "escalation_request", "confidence": 0.8}
    else:
        return {"intent": "general_question", "confidence": 0.5}


def build_plan(intent: str, text: str, customer_id: int) -> list[dict[str, Any]]:
    """
    Build execution plan based on intent.
    
    Returns list of steps, each with:
    - step: step number
    - action: tool name or action type
    - type: "read" or "write"
    - description: human-readable description
    - params: parameters for the action
    - status: "pending" for write actions that need approval
    """
    # Truncate text for descriptions
    short_text = text[:150] + "..." if len(text) > 150 else text
    
    # Base plan always starts with getting customer profile
    plan = [
        {
            "step": 1,
            "action": "get_customer_profile",
            "type": "read",
            "description": "Fetch customer profile and history",
            "params": {"customer_id": customer_id},
        }
    ]
    
    step_num = 2
    
    # Intent-specific steps
    if intent == "pricing_inquiry":
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search knowledge base for pricing information",
            "params": {"query": "pricing plans cost subscription student discount"},
        })
        step_num += 1
        
    elif intent == "bug_report":
        plan.append({
            "step": step_num,
            "action": "get_open_tickets",
            "type": "read",
            "description": "Check for existing tickets from customer",
            "params": {"customer_id": customer_id},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search troubleshooting guides",
            "params": {"query": "troubleshooting error fix"},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "create_ticket",
            "type": "write",
            "description": "Create support ticket for bug report",
            "params": {
                "customer_id": customer_id,
                "title": "Bug Report: " + text[:80],
                "description": short_text,
                "priority": "high",
                "category": "bug",
            },
            "status": "pending",
        })
        step_num += 1
        
    elif intent == "integration_help":
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search integration documentation",
            "params": {"query": "integration api webhook connect 401 error"},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "get_open_tickets",
            "type": "read",
            "description": "Check for existing integration tickets",
            "params": {"customer_id": customer_id},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "create_ticket",
            "type": "write",
            "description": "Create integration support ticket",
            "params": {
                "customer_id": customer_id,
                "title": "Integration Help: " + text[:80],
                "description": short_text,
                "priority": "high",
                "category": "integration",
            },
            "status": "pending",
        })
        step_num += 1
        
    elif intent == "billing_issue":
        plan.append({
            "step": step_num,
            "action": "get_open_tickets",
            "type": "read",
            "description": "Check for existing billing tickets",
            "params": {"customer_id": customer_id},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search billing documentation",
            "params": {"query": "billing invoice payment refund account"},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "create_ticket",
            "type": "write",
            "description": "Create billing support ticket",
            "params": {
                "customer_id": customer_id,
                "title": "Billing Issue: " + text[:80],
                "description": short_text,
                "priority": "medium",
                "category": "billing",
            },
            "status": "pending",
        })
        step_num += 1
        
    elif intent == "account_help":
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search account management docs",
            "params": {"query": "account password login profile settings security"},
        })
        step_num += 1
        
    elif intent == "technical_support":
        plan.append({
            "step": step_num,
            "action": "get_open_tickets",
            "type": "read",
            "description": "Check existing support tickets",
            "params": {"customer_id": customer_id},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search troubleshooting guides",
            "params": {"query": "troubleshooting help support"},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "create_ticket",
            "type": "write",
            "description": "Create technical support ticket",
            "params": {
                "customer_id": customer_id,
                "title": "Support Request: " + text[:80],
                "description": short_text,
                "priority": "medium",
                "category": "support",
            },
            "status": "pending",
        })
        step_num += 1
        
    elif intent == "feature_request":
        plan.append({
            "step": step_num,
            "action": "get_open_tickets",
            "type": "read",
            "description": "Check for similar feature requests",
            "params": {"customer_id": customer_id},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "create_ticket",
            "type": "write",
            "description": "Create feature request ticket",
            "params": {
                "customer_id": customer_id,
                "title": "Feature Request: " + text[:80],
                "description": short_text,
                "priority": "low",
                "category": "feature",
            },
            "status": "pending",
        })
        step_num += 1
        
    elif intent == "escalation_request":
        plan.append({
            "step": step_num,
            "action": "get_open_tickets",
            "type": "read",
            "description": "Review all open tickets",
            "params": {"customer_id": customer_id},
        })
        step_num += 1
        plan.append({
            "step": step_num,
            "action": "escalate_to_human",
            "type": "write",
            "description": "Escalate to human support agent",
            "params": {
                "customer_id": customer_id,
                "reason": short_text,
            },
            "status": "pending",
        })
        step_num += 1
        
    else:  # general_question
        plan.append({
            "step": step_num,
            "action": "search_kb",
            "type": "read",
            "description": "Search knowledge base for relevant info",
            "params": {"query": text[:100]},
        })
        step_num += 1
    
    # Always end with generate response
    plan.append({
        "step": step_num,
        "action": "generate_response",
        "type": "read",
        "description": "Generate AI response based on gathered context",
        "params": {},
    })
    
    return plan


async def execute_plan(
    plan: list[dict[str, Any]],
    customer_id: int,
    db: AsyncSession,
    run_id: int,
    skip_writes: bool = True,
) -> dict[str, Any]:
    """
    Execute the plan steps.
    
    Args:
        plan: List of plan steps
        customer_id: Customer ID
        db: Database session
        run_id: Agent run ID
        skip_writes: If True, skip write actions (collect them as pending)
    
    Returns context gathered from tool executions, plus pending_writes if any.
    """
    context = {
        "customer_profile": None,
        "open_tickets": None,
        "kb_results": None,
        "pending_writes": [],  # Write steps that weren't executed
    }
    
    for step in plan:
        action = step["action"]
        step_type = step["type"]
        params = step.get("params", {})
        
        # Handle write actions
        if step_type == "write":
            if skip_writes:
                # Collect pending write actions
                context["pending_writes"].append({
                    "step": step["step"],
                    "action": action,
                    "description": step.get("description", ""),
                    "params": params,
                    "status": "pending",
                })
            continue
            
        # Execute read actions
        if action == "get_customer_profile":
            result = await get_customer_profile(
                customer_id=params.get("customer_id", customer_id),
                db=db,
                run_id=run_id,
            )
            context["customer_profile"] = result
            
        elif action == "get_open_tickets":
            result = await get_open_tickets(
                customer_id=params.get("customer_id", customer_id),
                db=db,
                run_id=run_id,
            )
            context["open_tickets"] = result
            
        elif action == "search_kb":
            result = await search_kb(
                query=params.get("query", ""),
                db=db,
                run_id=run_id,
            )
            context["kb_results"] = result
    
    return context
