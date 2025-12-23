from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import DeclarativeBase, relationship


def format_datetime(dt: datetime | None) -> str | None:
    """Format datetime as ISO string with UTC indicator for proper timezone handling."""
    if dt is None:
        return None
    # Append 'Z' to indicate UTC timezone so browsers convert to local time
    return dt.isoformat() + "Z"


class Base(DeclarativeBase):
    pass


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    input_text = Column(Text, nullable=False)
    intent = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    plan_json = Column(Text, nullable=False)  # JSON string
    final_reply = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="agent_run", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "input_text": self.input_text,
            "intent": self.intent,
            "confidence": self.confidence,
            "plan_json": self.plan_json,
            "final_reply": self.final_reply,
            "created_at": format_datetime(self.created_at),
            "audit_logs": [log.to_dict() for log in self.audit_logs] if self.audit_logs else [],
        }


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=False)
    tool_name = Column(String(100), nullable=False)
    tool_input_json = Column(Text, nullable=True)
    tool_output_json = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    agent_run = relationship("AgentRun", back_populates="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.run_id,
            "tool_name": self.tool_name,
            "tool_input_json": self.tool_input_json,
            "tool_output_json": self.tool_output_json,
            "success": self.success,
            "created_at": format_datetime(self.created_at),
        }


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    company = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="customer", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="customer", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="customer", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "company": self.company,
            "created_at": format_datetime(self.created_at),
        }


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    direction = Column(String(10), nullable=False)  # "inbound" or "outbound"
    channel = Column(String(50), nullable=False)  # "email", "chat", etc.
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "direction": self.direction,
            "channel": self.channel,
            "subject": self.subject,
            "body": self.body,
            "created_at": format_datetime(self.created_at),
        }


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="open")  # "open", "in_progress", "resolved", "closed"
    priority = Column(String(20), default="medium")  # "low", "medium", "high", "urgent"
    category = Column(String(100), default="general")  # ticket category
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)  # timestamp when ticket was closed

    customer = relationship("Customer", back_populates="tickets")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "category": self.category,
            "created_at": format_datetime(self.created_at),
            "updated_at": format_datetime(self.updated_at),
            "closed_at": format_datetime(self.closed_at),
        }


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    event_type = Column(String(100), nullable=False)  # "login", "purchase", "support_request", etc.
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string for flexible data
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="events")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "event_type": self.event_type,
            "description": self.description,
            "metadata_json": self.metadata_json,
            "created_at": format_datetime(self.created_at),
        }


class GmailToken(Base):
    """Store Gmail OAuth tokens for the demo user."""
    __tablename__ = "gmail_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String(500), nullable=False)
    client_id = Column(String(255), nullable=False)
    client_secret = Column(Text, nullable=False)
    scopes = Column(Text, nullable=False)  # JSON array of scopes
    expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "connected": True,
            "created_at": format_datetime(self.created_at),
            "updated_at": format_datetime(self.updated_at),
        }

