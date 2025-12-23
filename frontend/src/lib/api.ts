// API base URL - reads from environment variable with fallback
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

// Export for error messages
export function getApiBase(): string {
  return API_BASE;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  customer_id: number;
  direction: "inbound" | "outbound";
  channel: string;
  subject: string | null;
  body: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  run_id: number;
  tool_name: string;
  tool_input_json: string | null;
  tool_output_json: string | null;
  success: boolean;
  created_at: string;
}

export interface PlanStep {
  step: number;
  action: string;
  type: "read" | "write";
  description: string;
  params: Record<string, unknown>;
  status?: string;
}

export interface PendingWrite {
  step: number;
  action: string;
  description: string;
  params: Record<string, unknown>;
  status: "pending";
}

export interface ExecutedAction {
  action: string;
  step: number;
  result: {
    ticket_id?: number;
    title?: string;
    status?: string;
    priority?: string;
    message?: string;
    error?: string;
  };
}

export interface Ticket {
  id: number;
  customer_id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface AgentRun {
  id: number;
  intent: string;
  confidence: number;
  plan_json: string;
  audit_logs: AuditLog[];
  pending_writes?: PendingWrite[];
  customer_id?: number;
  input_text?: string;
  final_reply?: string;
  created_at?: string;
}

export interface CustomersResponse {
  customers: Customer[];
}

export interface MessagesResponse {
  messages: Message[];
}

// Response when message is sent immediately (no approval required)
export interface SendMessageSentResponse {
  status: "sent";
  customer_message: Message;
  agent_message: Message;
  agent_run: AgentRun;
}

// Response when message requires human approval
export interface SendMessagePendingResponse {
  status: "pending_approval";
  customer_message: Message;
  draft_reply: string;
  agent_run: AgentRun;
  pending_writes: PendingWrite[];
}

export type SendMessageResponse = SendMessageSentResponse | SendMessagePendingResponse;

export interface GmailDraftResult {
  draft_id: string;
  message_id: string;
  success: boolean;
}

export interface ApproveMessageResponse {
  status: "sent";
  agent_message: Message;
  executed_actions: ExecutedAction[];
  gmail?: GmailDraftResult;
}

export interface GmailStatus {
  connected: boolean;
  enabled: boolean;
  email?: string;
  message?: string;
}

export interface GmailAuthUrl {
  url: string;
  state: string;
}

export interface TicketsResponse {
  tickets: Ticket[];
  count: number;
}

export interface LatestAgentRunResponse {
  agent_run: AgentRun | null;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const url = `${API_BASE}/api/customers`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to connect to API: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data: CustomersResponse = await response.json();
  return data.customers;
}

export async function fetchCustomerMessages(customerId: number): Promise<Message[]> {
  const url = `${API_BASE}/api/customers/${customerId}/messages`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to connect to API: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data: MessagesResponse = await response.json();
  return data.messages;
}

// Customer message type (alias for Message, but with sender field for clarity)
export interface CustomerMessage {
  id: number;
  customer_id: number;
  sender: "customer" | "support";
  content: string;
  created_at: string;
}

// Create a simple customer message (sends through agent)
export async function createCustomerMessage(
  customerId: number,
  content: string
): Promise<Message> {
  const url = `${API_BASE}/api/customers/${customerId}/messages`;
  let response: Response;
  
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        text: content,
        requires_approval: false 
      }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to send message: ${errorMsg}`);
  }
  
  if (!response.ok) {
    let detail = `${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        detail = errorData.detail;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`Failed to send message: ${detail}`);
  }
  
  const data: SendMessageResponse = await response.json();
  // Return the customer message that was created
  return data.customer_message;
}

// Seed demo data
export async function seedDemo(): Promise<{ message: string; seeded: boolean }> {
  return seedDatabase();
}

export async function sendCustomerMessage(
  customerId: number,
  text: string,
  requiresApproval: boolean = false
): Promise<SendMessageResponse> {
  const url = `${API_BASE}/api/customers/${customerId}/messages`;
  let response: Response;
  
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, requires_approval: requiresApproval }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to send message: ${errorMsg}\n\nAPI Base: ${API_BASE}`);
  }
  
  if (!response.ok) {
    throw new Error(`Failed to send message: API returned ${response.status}: ${response.statusText}\n\nAPI Base: ${API_BASE}`);
  }
  
  const data: SendMessageResponse = await response.json();
  return data;
}

export type ApproveAction = "chat_only" | "gmail_draft";

export async function approveMessage(
  customerId: number,
  draftText: string,
  action: ApproveAction = "chat_only",
  emailSubject: string = ""
): Promise<ApproveMessageResponse> {
  const url = `${API_BASE}/api/customers/${customerId}/approve`;
  let response: Response;
  
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        draft_text: draftText,
        action: action,
        email_subject: emailSubject,
      }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to approve message: ${errorMsg}\n\nAPI Base: ${API_BASE}`);
  }
  
  if (!response.ok) {
    // Try to get error detail from response
    let detail = `${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        detail = errorData.detail;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`Failed to approve message: ${detail}\n\nAPI Base: ${API_BASE}`);
  }
  
  const data: ApproveMessageResponse = await response.json();
  return data;
}

export async function fetchLatestAgentRun(customerId: number): Promise<AgentRun | null> {
  const url = `${API_BASE}/api/customers/${customerId}/latest-agent-run`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to fetch agent run: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data: LatestAgentRunResponse = await response.json();
  return data.agent_run;
}

export async function seedDatabase(): Promise<{ message: string; seeded: boolean }> {
  const url = `${API_BASE}/api/seed`;
  let response: Response;
  
  try {
    response = await fetch(url, {
      method: "POST",
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to connect to API: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export type TicketStatusFilter = "open" | "closed" | "all";

export async function fetchCustomerTickets(
  customerId: number,
  status: TicketStatusFilter = "open"
): Promise<{ tickets: Ticket[]; count: number }> {
  const url = `${API_BASE}/api/customers/${customerId}/tickets?status=${status}`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to fetch tickets: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data: TicketsResponse = await response.json();
  return { tickets: data.tickets, count: data.count };
}

export interface TicketWithCustomer extends Ticket {
  customer?: {
    id: number;
    name: string;
    email: string;
    company: string | null;
  };
}

export interface AllTicketsResponse {
  tickets: TicketWithCustomer[];
  count: number;
}

export async function fetchAllTickets(
  status: TicketStatusFilter = "all"
): Promise<{ tickets: TicketWithCustomer[]; count: number }> {
  const url = `${API_BASE}/api/tickets?status=${status}`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to fetch tickets: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data: AllTicketsResponse = await response.json();
  return { tickets: data.tickets, count: data.count };
}

export async function closeTicket(ticketId: number): Promise<Ticket> {
  const url = `${API_BASE}/api/tickets/${ticketId}/close`;
  let response: Response;
  
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to close ticket: ${errorMsg}`);
  }
  
  if (!response.ok) {
    // Try to get error detail from response
    let detail = `${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        detail = errorData.detail;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`Failed to close ticket: ${detail}`);
  }
  
  const data: { ticket: Ticket } = await response.json();
  return data.ticket;
}

export interface ExecuteActionResponse {
  success: boolean;
  action: string;
  result: Record<string, unknown>;
}

export async function executeAgentAction(
  runId: number,
  action: string,
  params: Record<string, unknown>
): Promise<ExecuteActionResponse> {
  const url = `${API_BASE}/api/agent-runs/${runId}/execute-action`;
  let response: Response;
  
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, params }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to execute action: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data: ExecuteActionResponse = await response.json();
  return data;
}


// ============================================================================
// Gmail Integration
// ============================================================================

export async function getGmailStatus(): Promise<GmailStatus> {
  const url = `${API_BASE}/api/gmail/status`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    // If connection fails, Gmail is not available
    return { connected: false, enabled: false, message: "Failed to connect to API" };
  }
  
  if (!response.ok) {
    return { connected: false, enabled: false, message: `API error: ${response.status}` };
  }
  
  const data: GmailStatus = await response.json();
  return data;
}

export async function getGmailAuthUrl(): Promise<GmailAuthUrl> {
  const url = `${API_BASE}/api/gmail/auth-url`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to get Gmail auth URL: ${errorMsg}`);
  }
  
  if (!response.ok) {
    let detail = `${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        detail = errorData.detail;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`Failed to get Gmail auth URL: ${detail}`);
  }
  
  const data: GmailAuthUrl = await response.json();
  return data;
}

export async function disconnectGmail(): Promise<{ disconnected: boolean }> {
  const url = `${API_BASE}/api/gmail/disconnect`;
  let response: Response;
  
  try {
    response = await fetch(url, { method: "POST" });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to disconnect Gmail: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export interface KBSearchResult {
  source_file: string;
  heading: string;
  snippet: string;
  score: number;
}

export interface KBSearchResponse {
  results: KBSearchResult[];
  count: number;
}

export async function searchKnowledgeBase(query: string): Promise<KBSearchResponse> {
  const url = `${API_BASE}/api/kb/search?q=${encodeURIComponent(query)}`;
  let response: Response;
  
  try {
    response = await fetch(url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to search knowledge base: ${errorMsg}`);
  }
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    results: data.results || [],
    count: data.count || 0,
  };
}
