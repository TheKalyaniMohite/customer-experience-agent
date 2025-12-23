// API Base URL - sanitize trailing slashes
function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
  return base.replace(/\/+$/, ""); // Remove trailing slashes
}

const API_BASE = getApiBase();

// Request wrapper with error handling
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to connect to API: ${errorMsg}\n\nAPI Base: ${API_BASE}`);
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
    throw new Error(`API error: ${detail}\n\nAPI Base: ${API_BASE}`);
  }

  return response.json();
}

// ============================================================================
// Types
// ============================================================================

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

export interface Ticket {
  id: number;
  customer_id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high";
  category: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface TicketWithCustomer extends Ticket {
  customer?: {
    id: number;
    name: string;
    email: string;
    company: string | null;
  };
}

export interface AgentRun {
  id: number;
  customer_id: number;
  input_text: string;
  intent: string;
  confidence: number;
  plan_json: string;
  final_reply: string;
  created_at: string;
  audit_logs: AuditLog[];
}

export interface PlanStep {
  step: number;
  action: string;
  type: "read" | "write";
  description: string;
  params: Record<string, unknown>;
  status?: string;
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
    message?: string;
    [key: string]: unknown;
  };
}

export type TicketStatusFilter = "open" | "closed" | "all";

export interface GmailStatus {
  connected: boolean;
  enabled: boolean;
  email?: string;
}

export type ApproveAction = "chat_only" | "gmail_draft";

export interface ApproveMessageResponse {
  status: string;
  agent_message: Message;
  executed_actions?: ExecutedAction[];
  gmail?: {
    success: boolean;
    draft_id?: string;
    message_id?: string;
  };
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

export interface ExecuteActionResponse {
  success: boolean;
  action: string;
  result: Record<string, unknown>;
}

export interface AllTicketsResponse {
  tickets: TicketWithCustomer[];
  count: number;
}

export interface TicketsResponse {
  tickets: Ticket[];
  count: number;
}

export interface LatestAgentRunResponse {
  agent_run: AgentRun | null;
}

// ============================================================================
// Customer APIs
// ============================================================================

export async function fetchCustomers(): Promise<Customer[]> {
  const data = await request<{ customers: Customer[] }>("/api/customers");
  return data.customers;
}

// Alias for customer portal
export const getCustomers = fetchCustomers;

export async function fetchCustomerMessages(customerId: number): Promise<Message[]> {
  const data = await request<{ messages: Message[] }>(`/api/customers/${customerId}/messages`);
  return data.messages;
}

// Alias for customer portal
export const getCustomerMessages = fetchCustomerMessages;

// Response types for sendCustomerMessage
export interface SendMessagePendingResponse {
  status: "pending_approval";
  customer_message: Message;
  draft_reply: string;
  agent_run: AgentRun;
  pending_writes: PendingWrite[];
}

export interface SendMessageSentResponse {
  status: "sent";
  customer_message: Message;
  agent_message: Message;
  agent_run: AgentRun;
}

export type SendCustomerMessageResponse = SendMessagePendingResponse | SendMessageSentResponse;

export async function sendCustomerMessage(
  customerId: number,
  text: string,
  requiresApproval: boolean = false
): Promise<SendCustomerMessageResponse> {
  return request(`/api/customers/${customerId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, requires_approval: requiresApproval }),
  });
}

export async function approveMessage(
  customerId: number,
  draftText: string,
  action: ApproveAction = "chat_only",
  emailSubject: string = ""
): Promise<ApproveMessageResponse> {
  return request(`/api/customers/${customerId}/approve`, {
    method: "POST",
    body: JSON.stringify({
      draft_text: draftText,
      action,
      email_subject: emailSubject,
    }),
  });
}

// ============================================================================
// Ticket APIs
// ============================================================================

export async function fetchCustomerTickets(
  customerId: number,
  status: TicketStatusFilter = "all"
): Promise<{ tickets: Ticket[]; count: number }> {
  const data = await request<TicketsResponse>(`/api/customers/${customerId}/tickets?status=${status}`);
  return { tickets: data.tickets, count: data.count };
}

// Alias for customer portal
export const getCustomerTickets = fetchCustomerTickets;

export async function fetchAllTickets(
  status: TicketStatusFilter = "all"
): Promise<{ tickets: TicketWithCustomer[]; count: number }> {
  const data = await request<AllTicketsResponse>(`/api/tickets?status=${status}`);
  return { tickets: data.tickets, count: data.count };
}

export async function closeTicket(ticketId: number): Promise<Ticket> {
  const data = await request<{ ticket: Ticket }>(`/api/tickets/${ticketId}/close`, {
    method: "POST",
  });
  return data.ticket;
}

// ============================================================================
// Agent APIs
// ============================================================================

export async function fetchLatestAgentRun(customerId: number): Promise<AgentRun | null> {
  const data = await request<LatestAgentRunResponse>(`/api/customers/${customerId}/latest-agent-run`);
  return data.agent_run;
}

export async function executeAgentAction(
  runId: number,
  action: string,
  params: Record<string, unknown>
): Promise<ExecuteActionResponse> {
  return request(`/api/agent-runs/${runId}/execute-action`, {
    method: "POST",
    body: JSON.stringify({ action, params }),
  });
}

// ============================================================================
// Seed/Demo APIs
// ============================================================================

export async function seedDatabase(): Promise<{ message: string; seeded: boolean }> {
  return request("/api/seed", {
    method: "POST",
  });
}

// Alias for consistency
export const seedDemo = seedDatabase;
export const seedDemoData = seedDatabase;

// ============================================================================
// Gmail APIs
// ============================================================================

export async function getGmailStatus(): Promise<GmailStatus> {
  return request("/api/gmail/status");
}

export async function getGmailAuthUrl(): Promise<{ url: string }> {
  return request("/api/gmail/auth-url");
}

export async function disconnectGmail(): Promise<{ disconnected: boolean }> {
  return request("/api/gmail/disconnect", {
    method: "POST",
  });
}

// ============================================================================
// Knowledge Base APIs
// ============================================================================

export async function searchKnowledgeBase(query: string): Promise<KBSearchResponse> {
  const data = await request<{ results: KBSearchResult[]; query: string }>(
    `/api/kb/search?q=${encodeURIComponent(query)}`
  );
  return {
    results: data.results || [],
    count: data.results?.length || 0,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export { getApiBase };

