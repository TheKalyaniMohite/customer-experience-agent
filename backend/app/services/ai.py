"""AI service for generating customer support replies using OpenAI."""

import json
import logging
import os
import random
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Try to import OpenAI - if not installed, we'll use mock replies
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI package not installed. Using mock replies.")


def get_openai_client() -> Optional["OpenAI"]:
    """Get OpenAI client if API key is available."""
    if not OPENAI_AVAILABLE:
        return None
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set. Using mock replies.")
        return None
    
    return OpenAI(api_key=api_key)


def format_kb_sources(context: Optional[dict]) -> str:
    """Format KB sources for display at the end of a reply."""
    if not context or not context.get("kb_results"):
        return ""
    
    kb_results = context["kb_results"].get("results", [])
    if not kb_results:
        return ""
    
    # Deduplicate by source_file
    seen_files = set()
    unique_sources = []
    for r in kb_results:
        source = r.get("source_file", "")
        heading = r.get("heading", "")
        if source and source not in seen_files:
            seen_files.add(source)
            unique_sources.append({"source_file": source, "heading": heading})
    
    if not unique_sources:
        return ""
    
    sources_text = "\n\n---\n**Sources used:**\n"
    for s in unique_sources[:3]:
        sources_text += f"- {s['source_file']}"
        if s['heading']:
            sources_text += f" ({s['heading']})"
        sources_text += "\n"
    
    return sources_text


def generate_mock_reply(customer_name: str, customer_message: str, context: Optional[dict] = None) -> str:
    """Generate a mock reply when OpenAI is not available."""
    # Check if we have KB results to reference
    kb_used = context and context.get("kb_results") and context["kb_results"].get("count", 0) > 0
    
    base_reply = ""
    if kb_used:
        kb_results = context["kb_results"]["results"]
        # Get the heading/topic from first result
        if kb_results and kb_results[0].get("heading"):
            topic = kb_results[0]["heading"]
        else:
            topic = "our documentation"
        
        mock_replies = [
            f"Hi {customer_name}! Based on our help docs about {topic}, I can help you with that. Our pricing plans range from Basic at $29/month to Enterprise at $199/month. Students get 50% off with a valid .edu email!",
            f"Thanks for reaching out, {customer_name}! I found some relevant info about {topic} that should help. We offer three plans with different features, and yes, we have a 50% student discount available.",
            f"Hello {customer_name}! According to our documentation on {topic}, here's what you need to know: We have Basic ($29), Pro ($79), and Enterprise ($199) plans. Students qualify for 50% off with proof of enrollment.",
        ]
        base_reply = random.choice(mock_replies)
    else:
        mock_replies = [
            f"Thank you for reaching out, {customer_name}! I'd be happy to help you with that.",
            f"Hi {customer_name}, thanks for your message. Let me look into this for you.",
            f"Hello {customer_name}! I appreciate you contacting us. I'll assist you right away.",
            f"Thanks for your question, {customer_name}. Here's what I can tell you...",
        ]
        base_reply = random.choice(mock_replies)
    
    # Add sources section
    sources = format_kb_sources(context)
    return base_reply + sources


async def generate_agent_reply_with_context(
    customer_name: str,
    customer_message: str,
    intent: str,
    context: dict[str, Any],
    company_name: Optional[str] = None,
) -> str:
    """
    Generate an AI-powered customer support reply using gathered context.
    
    Args:
        customer_name: Customer's name
        customer_message: The customer's message
        intent: Classified intent
        context: Context gathered from tools (customer_profile, open_tickets, kb_results)
        company_name: Customer's company name
    """
    client = get_openai_client()
    
    if client is None:
        return generate_mock_reply(customer_name, customer_message, context)
    
    # Build context string
    context_parts = [f"Customer: {customer_name}"]
    if company_name:
        context_parts.append(f"Company: {company_name}")
    context_parts.append(f"Intent: {intent}")
    
    if context.get("customer_profile"):
        profile = context["customer_profile"]
        context_parts.append(f"Customer since: {profile.get('created_at', 'Unknown')}")
    
    if context.get("open_tickets"):
        tickets = context["open_tickets"]
        if tickets.get("count", 0) > 0:
            context_parts.append(f"Open tickets: {tickets['count']}")
            for t in tickets.get("tickets", [])[:2]:
                context_parts.append(f"  - {t['title']} ({t['status']}, {t['priority']})")
    
    kb_info = ""
    kb_snippets = []
    if context.get("kb_results") and context["kb_results"].get("count", 0) > 0:
        kb_results = context["kb_results"]["results"]
        kb_info = "\n\nRelevant documentation:\n"
        for r in kb_results[:3]:
            heading = r.get("heading", r.get("title", "Unknown"))
            snippet = r.get("snippet", "")
            kb_info += f"- {heading}: {snippet}\n"
            kb_snippets.append(r)
    
    system_prompt = """You are a friendly and professional customer support agent.
Your goal is to provide helpful, concise, and empathetic responses.
Keep responses brief (2-4 sentences) and actionable.
Always address the customer by name and maintain a warm tone.
If documentation was provided, reference it naturally (e.g., "Based on our help docs...").
Do NOT include a sources section - that will be added automatically."""

    user_prompt = f"""Context:
{chr(10).join(context_parts)}
{kb_info}
Customer message: {customer_message}

Generate a helpful, personalized support reply:"""

    try:
        model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=200,
            temperature=0.7,
        )
        
        reply = response.choices[0].message.content
        if reply:
            # Add sources section if KB was used
            sources = format_kb_sources(context)
            return reply.strip() + sources
        else:
            logger.error("OpenAI returned empty response")
            return generate_mock_reply(customer_name, customer_message, context)
            
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return generate_mock_reply(customer_name, customer_message, context)


async def generate_agent_reply(
    customer_name: str,
    customer_message: str,
    company_name: Optional[str] = None,
) -> str:
    """
    Generate an AI-powered customer support reply.
    
    Falls back to mock reply if:
    - OpenAI package not installed
    - OPENAI_API_KEY not set
    - OpenAI API call fails
    """
    client = get_openai_client()
    
    if client is None:
        return generate_mock_reply(customer_name, customer_message)
    
    # Build context about the customer
    customer_context = f"Customer name: {customer_name}"
    if company_name:
        customer_context += f"\nCompany: {company_name}"
    
    system_prompt = """You are a friendly and professional customer support agent. 
Your goal is to provide helpful, concise, and empathetic responses.
Keep responses brief (2-3 sentences max) and actionable.
Always address the customer by name and maintain a warm tone."""

    user_prompt = f"""{customer_context}

Customer message: {customer_message}

Generate a helpful support reply:"""

    try:
        model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=150,
            temperature=0.7,
        )
        
        reply = response.choices[0].message.content
        if reply:
            return reply.strip()
        else:
            logger.error("OpenAI returned empty response")
            return generate_mock_reply(customer_name, customer_message)
            
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return generate_mock_reply(customer_name, customer_message)

