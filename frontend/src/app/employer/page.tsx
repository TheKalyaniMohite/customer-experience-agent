"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  fetchCustomers, 
  fetchCustomerMessages, 
  sendCustomerMessage, 
  approveMessage,
  fetchLatestAgentRun,
  fetchCustomerTickets,
  fetchAllTickets,
  closeTicket,
  executeAgentAction,
  seedDatabase, 
  getApiBase, 
  getGmailStatus,
  getGmailAuthUrl,
  disconnectGmail,
  searchKnowledgeBase,
  Customer, 
  Message,
  AgentRun,
  PlanStep,
  AuditLog,
  PendingWrite,
  ExecutedAction,
  Ticket,
  TicketWithCustomer,
  TicketStatusFilter,
  GmailStatus,
  ApproveAction,
  KBSearchResult,
} from "@/lib/api";
import {
  Inbox,
  BarChart3,
  BookOpen,
  Settings,
  Menu,
  X,
} from "lucide-react";

type TopTab = "activity" | "tickets" | "customers" | "knowledge" | "settings";

// Step details for modal
interface StepDetails {
  step: PlanStep;
  auditLog: AuditLog | null;
}

// Draft reply state for human approval mode
interface DraftReply {
  text: string;
  originalText: string;
  pendingWrites: PendingWrite[];
}

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("customers");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [humanApprovalMode, setHumanApprovalMode] = useState(false);
  const [draftReply, setDraftReply] = useState<DraftReply | null>(null);
  const [approving, setApproving] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<TicketWithCustomer[]>([]);
  const [ticketNotification, setTicketNotification] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navSidebarOpen, setNavSidebarOpen] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, enabled: false });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<TicketStatusFilter>("all");
  const [selectedGlobalTicket, setSelectedGlobalTicket] = useState<TicketWithCustomer | null>(null);
  const [allTicketsLoading, setAllTicketsLoading] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const [kbResults, setKbResults] = useState<KBSearchResult[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [selectedKbDoc, setSelectedKbDoc] = useState<KBSearchResult | null>(null);

  // Load Gmail status
  const loadGmailStatus = useCallback(async () => {
    const status = await getGmailStatus();
    setGmailStatus(status);
  }, []);

  useEffect(() => {
    loadCustomers();
    loadGmailStatus();
    
    // Listen for Gmail OAuth callback message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'gmail_connected') {
        loadGmailStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadGmailStatus]);

  useEffect(() => {
    if (selectedCustomer) {
      loadMessages(selectedCustomer.id);
      loadLatestAgentRun(selectedCustomer.id);
      loadTickets(selectedCustomer.id);
      // Close mobile sidebar when customer is selected
      setSidebarOpen(false);
    }
  }, [selectedCustomer]);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomers();
      setCustomers(data);
      if (data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`${errorMsg}\n\nAPI Base: ${getApiBase()}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(customerId: number) {
    try {
      setMessagesLoading(true);
      setSendError(null);
      const data = await fetchCustomerMessages(customerId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function loadLatestAgentRun(customerId: number) {
    try {
      const run = await fetchLatestAgentRun(customerId);
      setAgentRun(run);
    } catch {
      setAgentRun(null);
    }
  }

  async function loadTickets(customerId: number, status: TicketStatusFilter = "all") {
    try {
      const data = await fetchCustomerTickets(customerId, status);
      setTickets(data.tickets);
    } catch {
      setTickets([]);
    }
  }

  async function loadAllTickets(status: TicketStatusFilter = "all") {
    try {
      setAllTicketsLoading(true);
      const data = await fetchAllTickets(status);
      setAllTickets(data.tickets);
    } catch {
      setAllTickets([]);
    } finally {
      setAllTicketsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTopTab === "tickets") {
      loadAllTickets(ticketFilter);
    }
  }, [activeTopTab, ticketFilter]);

  async function handleSeed() {
    try {
      await seedDatabase();
      await loadCustomers();
    } catch {
      setError("Failed to seed database.");
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedCustomer || sending) return;

    try {
      setSending(true);
      setSendError(null);
      const response = await sendCustomerMessage(selectedCustomer.id, newMessage.trim(), humanApprovalMode);
      
      if (response.status === "pending_approval") {
        setMessages((prev) => [...prev, response.customer_message]);
        setAgentRun(response.agent_run);
        setDraftReply({
          text: response.draft_reply,
          originalText: response.draft_reply,
          pendingWrites: response.pending_writes || [],
        });
      } else {
        setMessages((prev) => [...prev, response.customer_message, response.agent_message]);
        setAgentRun(response.agent_run);
        setDraftReply(null);
      }
      setNewMessage("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setSendError(errorMsg);
    } finally {
      setSending(false);
    }
  }

  async function handleApproveReply() {
    if (!draftReply || !selectedCustomer || approving) return;

    try {
      setApproving(true);
      setSendError(null);
      setTicketNotification(null);
      const response = await approveMessage(selectedCustomer.id, draftReply.text);
      setMessages((prev) => [...prev, response.agent_message]);
      setDraftReply(null);
      
      if (response.executed_actions && response.executed_actions.length > 0) {
        const ticketActions = response.executed_actions.filter(
          (a: ExecutedAction) => a.action === "create_ticket" || a.action === "escalate_to_human"
        );
        if (ticketActions.length > 0) {
          const notifications = ticketActions.map((a: ExecutedAction) => {
            if (a.result.ticket_id) {
              return `Ticket created: #${a.result.ticket_id}`;
            }
            return a.result.message || "Action executed";
          });
          setTicketNotification(notifications.join(", "));
          await loadTickets(selectedCustomer.id);
          setTimeout(() => setTicketNotification(null), 5000);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setSendError(errorMsg);
    } finally {
      setApproving(false);
    }
  }

  function handleCancelDraft() {
    setDraftReply(null);
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setSendError(null);
    setAgentRun(null);
    setDraftReply(null);
    setTicketNotification(null);
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--background)]">
      {/* Header - Minimalist */}
      <header className="flex-shrink-0 bg-[var(--sidebar-bg)] border-b border-[var(--border)] z-30">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          {/* Left: Menu + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNavSidebarOpen(!navSidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-[var(--background)] transition-colors"
              aria-label="Toggle navigation"
            >
              {navSidebarOpen ? (
                <X className="w-5 h-5 text-[var(--foreground)]" />
              ) : (
                <Menu className="w-5 h-5 text-[var(--foreground)]" />
              )}
            </button>
            {activeTopTab === "customers" && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md hover:bg-[var(--background)] transition-colors"
                aria-label="Toggle customer list"
              >
                <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-base font-semibold text-[var(--foreground)]">
                Employer Dashboard
              </h1>
            </div>
          </div>

          {/* Right: Gmail */}
          <div className="flex items-center gap-2">
            <GmailButton 
              gmailStatus={gmailStatus} 
              onStatusChange={loadGmailStatus}
              loading={gmailLoading}
              setLoading={setGmailLoading}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Navigation Sidebar Overlay */}
        {navSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => setNavSidebarOpen(false)}
          />
        )}

        {/* Navigation Sidebar - Minimalist */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-56
          bg-[var(--sidebar-bg)] border-r border-[var(--border)]
          flex flex-col
          transform transition-transform duration-200 ease-out
          ${navSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => {
                setActiveTopTab("customers");
                setShowSuccessDashboard(false);
                setNavSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1
                transition-colors text-left
                ${
                  activeTopTab === "customers"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }
              `}
            >
              <Inbox className="w-4 h-4" />
              <span className="text-sm font-medium">Customers</span>
            </button>
            <button
              onClick={() => {
                setActiveTopTab("tickets");
                setNavSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1
                transition-colors text-left
                ${
                  activeTopTab === "tickets"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium">Tickets</span>
            </button>
            <button
              onClick={() => {
                setActiveTopTab("activity");
                setNavSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1
                transition-colors text-left
                ${
                  activeTopTab === "activity"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">Activity</span>
            </button>
            <button
              onClick={() => {
                setActiveTopTab("knowledge");
                setNavSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1
                transition-colors text-left
                ${
                  activeTopTab === "knowledge"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }
              `}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Knowledge Base</span>
            </button>
            <button
              onClick={() => {
                setActiveTopTab("settings");
                setNavSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1
                transition-colors text-left
                ${
                  activeTopTab === "settings"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Customer List Sidebar (only for Customers tab) */}
          {activeTopTab === "customers" && (
            <>
              {/* Mobile Customer Sidebar Overlay */}
              {sidebarOpen && (
                <div 
                  className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* Customer List Sidebar - Clean & Minimalist */}
              <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64
                bg-[var(--sidebar-bg)] border-r border-[var(--border)]
                flex flex-col
                transform transition-transform duration-200 ease-out
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
              `}>
                {/* Sidebar Header */}
                <div className="flex-shrink-0 p-3 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Customers
                    </h2>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="lg:hidden p-1 rounded hover:bg-[var(--background)] transition-colors"
                    >
                      <X className="w-4 h-4 text-[var(--muted)]" />
                    </button>
                  </div>
                  {customers.length === 0 && !loading && (
                    <button
                      onClick={handleSeed}
                      className="w-full px-3 py-1.5 text-xs font-medium bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      Seed Demo Data
                    </button>
                  )}
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="skeleton h-14 rounded-md" />
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-3">
                      <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-md">
                        <p className="text-xs text-[var(--danger)] break-words">{error}</p>
                      </div>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-4 text-center text-[var(--muted)] text-sm">
                      No customers yet
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {customers.map((customer) => (
                        <li key={customer.id}>
                          <button
                            onClick={() => handleSelectCustomer(customer)}
                            className={`w-full text-left p-2.5 rounded-md transition-colors ${
                              selectedCustomer?.id === customer.id
                                ? "bg-[var(--primary)] text-white"
                                : "hover:bg-[var(--background)] text-[var(--foreground)]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                                selectedCustomer?.id === customer.id
                                  ? "bg-white/20 text-white"
                                  : "bg-[var(--primary)] text-white"
                              }`}>
                                {customer.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-sm truncate ${
                                  selectedCustomer?.id === customer.id 
                                    ? "font-medium" 
                                    : "font-normal"
                                }`}>
                                  {customer.name}
                                </div>
                                <div className={`text-xs truncate ${
                                  selectedCustomer?.id === customer.id
                                    ? "text-white/70"
                                    : "text-[var(--muted)]"
                                }`}>
                                  {customer.email}
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </>
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Activity Tab - Show ONLY agent activity (execution plan/audit log) */}
            {activeTopTab === "activity" && (
              <div className="flex-1 flex overflow-hidden">
                {selectedCustomer ? (
                  <div className="flex-1 flex">
                    <div className="flex-1 p-6 overflow-y-auto">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Agent Activity</h2>
                        <p className="text-sm text-[var(--muted)]">
                          Viewing activity for <span className="font-medium text-[var(--foreground)]">{selectedCustomer.name}</span>
                        </p>
                      </div>
                      <div className="max-w-5xl">
                        <AgentPanel
                          agentRun={agentRun}
                          humanApprovalMode={humanApprovalMode}
                          onActionExecuted={() => {
                            if (selectedCustomer) {
                              loadLatestAgentRun(selectedCustomer.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="card p-8 text-center max-w-md">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--background)] flex items-center justify-center">
                        <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Select a Customer</h3>
                      <p className="text-[var(--muted)] mb-4">
                        Select a customer from the Customers tab to view agent activity, execution plans, and audit logs.
                      </p>
                      <button
                        onClick={() => setActiveTopTab("customers")}
                        className="btn btn-primary"
                      >
                        Go to Customers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customers Tab - Show customer list + chat conversation (full inbox workflow) */}
            {activeTopTab === "customers" && (
              <SupportInbox
                customer={selectedCustomer}
                messages={messages}
                messagesLoading={messagesLoading}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={handleSendMessage}
                sending={sending}
                sendError={sendError}
                agentRun={agentRun}
                humanApprovalMode={humanApprovalMode}
                setHumanApprovalMode={setHumanApprovalMode}
                draftReply={draftReply}
                setDraftReply={setDraftReply}
                onCancelDraft={handleCancelDraft}
                approving={approving}
                setApproving={setApproving}
                setSendError={setSendError}
                tickets={tickets}
                ticketNotification={ticketNotification}
                setTicketNotification={setTicketNotification}
                onTicketsRefresh={() => selectedCustomer && loadTickets(selectedCustomer.id)}
                agentPanelOpen={agentPanelOpen}
                setAgentPanelOpen={setAgentPanelOpen}
                gmailStatus={gmailStatus}
                setMessages={setMessages}
              />
            )}

            {/* Tickets Tab - Global ticket management */}
            {activeTopTab === "tickets" && (
              <div className="flex-1 flex overflow-hidden">
                {/* Ticket List */}
                <div className="w-full lg:w-96 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col">
                  <div className="p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">All Tickets</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTicketFilter("open")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          ticketFilter === "open"
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => setTicketFilter("closed")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          ticketFilter === "closed"
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        Closed
                      </button>
                      <button
                        onClick={() => setTicketFilter("all")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          ticketFilter === "all"
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {allTicketsLoading ? (
                      <div className="p-4 text-center text-[var(--muted)] text-sm">Loading tickets...</div>
                    ) : allTickets.length === 0 ? (
                      <div className="p-4 text-center text-[var(--muted)] text-sm">
                        No {ticketFilter === "all" ? "" : ticketFilter} tickets
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {allTickets.map((ticket) => (
                          <li key={ticket.id}>
                            <button
                              onClick={() => setSelectedGlobalTicket(ticket)}
                              className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
                                selectedGlobalTicket?.id === ticket.id
                                  ? "bg-gradient-to-r from-[var(--primary-light)] to-indigo-50 dark:to-indigo-950/30 border-[var(--primary)] shadow-md"
                                  : "bg-[var(--card-bg)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 flex-1">
                                  {ticket.title}
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                                  ticket.status === "open" || ticket.status === "in_progress"
                                    ? "bg-[var(--success)] text-white"
                                    : "bg-[var(--muted)] text-[var(--foreground)]"
                                }`}>
                                  {ticket.status}
                                </span>
                              </div>
                              {ticket.customer && (
                                <div className="text-xs text-[var(--muted)] mb-1">
                                  {ticket.customer.name}
                                </div>
                              )}
                              <p className="text-xs text-[var(--muted)] line-clamp-2 mb-2">
                                {ticket.description}
                              </p>
                              <div className="text-xs text-[var(--muted-light)]">
                                {new Date(ticket.created_at).toLocaleDateString()}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedGlobalTicket ? (
                    <div className="max-w-3xl">
                      <div className="mb-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <h2 className="text-2xl font-bold text-[var(--foreground)]">
                            {selectedGlobalTicket.title}
                          </h2>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded ${
                              selectedGlobalTicket.priority === "high"
                                ? "bg-[var(--danger)] text-white"
                                : selectedGlobalTicket.priority === "medium"
                                ? "bg-[var(--warning)] text-white"
                                : "bg-[var(--muted)] text-[var(--foreground)]"
                            }`}>
                              {selectedGlobalTicket.priority}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              selectedGlobalTicket.status === "open" || selectedGlobalTicket.status === "in_progress"
                                ? "bg-[var(--success)] text-white"
                                : "bg-[var(--muted)] text-[var(--foreground)]"
                            }`}>
                              {selectedGlobalTicket.status}
                            </span>
                            {selectedGlobalTicket.category && (
                              <span className="text-xs px-2 py-1 rounded bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)]">
                                {selectedGlobalTicket.category}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedGlobalTicket.customer && (
                          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                            <div className="text-sm font-semibold text-[var(--foreground)] mb-1">Customer</div>
                            <div className="text-sm text-[var(--muted)]">
                              {selectedGlobalTicket.customer.name} ({selectedGlobalTicket.customer.email})
                              {selectedGlobalTicket.customer.company && ` • ${selectedGlobalTicket.customer.company}`}
                            </div>
                          </div>
                        )}
                        <div className="text-sm text-[var(--muted)] space-y-1">
                          <div>Created: {new Date(selectedGlobalTicket.created_at).toLocaleString()}</div>
                          <div>Last updated: {new Date(selectedGlobalTicket.updated_at).toLocaleString()}</div>
                          {selectedGlobalTicket.closed_at && (
                            <div>Closed: {new Date(selectedGlobalTicket.closed_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                      <div className="card p-6">
                        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                          Description
                        </h3>
                        <p className="text-[var(--foreground)] whitespace-pre-wrap">
                          {selectedGlobalTicket.description}
                        </p>
                      </div>
                      {selectedGlobalTicket.status !== "closed" && (
                        <div className="mt-6">
                          <button
                            onClick={async () => {
                              try {
                                await closeTicket(selectedGlobalTicket.id);
                                setSelectedGlobalTicket({ ...selectedGlobalTicket, status: "closed", closed_at: new Date().toISOString() });
                                await loadAllTickets(ticketFilter);
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Failed to close ticket");
                              }
                            }}
                            className="btn btn-primary"
                          >
                            Close Ticket
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[var(--muted)]">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>Select a ticket to view details</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Knowledge Base Tab */}
            {activeTopTab === "knowledge" && (
              <div className="flex-1 flex overflow-hidden">
                {/* KB Search & List */}
                <div className="w-full lg:w-96 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col">
                  <div className="p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">Knowledge Base</h2>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={kbSearchQuery}
                        onChange={(e) => setKbSearchQuery(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && kbSearchQuery.trim()) {
                            try {
                              setKbLoading(true);
                              const data = await searchKnowledgeBase(kbSearchQuery);
                              setKbResults(data.results);
                            } catch (err) {
                              console.error("KB search error:", err);
                              setKbResults([]);
                            } finally {
                              setKbLoading(false);
                            }
                          }
                        }}
                        placeholder="Search knowledge base..."
                        className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      />
                      <button
                        onClick={async () => {
                          if (kbSearchQuery.trim()) {
                            try {
                              setKbLoading(true);
                              const data = await searchKnowledgeBase(kbSearchQuery);
                              setKbResults(data.results);
                            } catch (err) {
                              console.error("KB search error:", err);
                              setKbResults([]);
                            } finally {
                              setKbLoading(false);
                            }
                          }
                        }}
                        disabled={!kbSearchQuery.trim() || kbLoading}
                        className="btn btn-primary px-4 disabled:opacity-50"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {kbLoading ? (
                      <div className="p-4 text-center text-[var(--muted)] text-sm">Searching...</div>
                    ) : kbResults.length === 0 ? (
                      <div className="p-4 text-center text-[var(--muted)] text-sm">
                        {kbSearchQuery ? "No results found" : "Enter a search query to find articles"}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {kbResults.map((result, idx) => (
                          <li key={idx}>
                            <button
                              onClick={() => setSelectedKbDoc(result)}
                              className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
                                selectedKbDoc?.source_file === result.source_file && selectedKbDoc?.heading === result.heading
                                  ? "bg-gradient-to-r from-[var(--primary-light)] to-indigo-50 dark:to-indigo-950/30 border-[var(--primary)] shadow-md"
                                  : "bg-[var(--card-bg)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-sm"
                              }`}
                            >
                              <div className="text-xs text-[var(--muted)] mb-1 font-medium">
                                {result.source_file}
                              </div>
                              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                                {result.heading || "Untitled"}
                              </h3>
                              <p className="text-xs text-[var(--muted)] line-clamp-3">
                                {result.snippet}
                              </p>
                              <div className="mt-2 text-xs text-[var(--muted-light)]">
                                Score: {result.score.toFixed(2)}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* KB Document Viewer */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedKbDoc ? (
                    <div className="max-w-3xl">
                      <div className="mb-6">
                        <div className="text-xs text-[var(--muted)] mb-2 font-medium">
                          {selectedKbDoc.source_file}
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                          {selectedKbDoc.heading || "Untitled"}
                        </h2>
                      </div>
                      <div className="card p-6">
                        <div className="prose prose-sm max-w-none">
                          <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                            {selectedKbDoc.snippet}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                          <div className="text-xs text-[var(--muted)]">
                            Relevance score: {selectedKbDoc.score.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[var(--muted)]">
                      <div className="text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Search and select an article to view</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTopTab === "settings" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Settings</h2>
                  
                  {/* Gmail Integration */}
                  <div className="card p-6 mb-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Gmail Integration</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                        <div>
                          <div className="font-medium text-[var(--foreground)] mb-1">Connection Status</div>
                          <div className="text-sm text-[var(--muted)]">
                            {gmailStatus.enabled ? (
                              gmailStatus.connected ? (
                                <span className="text-[var(--success)]">Connected as {gmailStatus.email}</span>
                              ) : (
                                <span className="text-[var(--muted)]">Gmail enabled but not connected</span>
                              )
                            ) : (
                              <span className="text-[var(--muted)]">Gmail integration disabled</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {gmailStatus.connected ? (
                            <button
                              onClick={async () => {
                                try {
                                  setGmailLoading(true);
                                  await disconnectGmail();
                                  await loadGmailStatus();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to disconnect");
                                } finally {
                                  setGmailLoading(false);
                                }
                              }}
                              disabled={gmailLoading}
                              className="btn btn-secondary text-sm"
                            >
                              {gmailLoading ? "Disconnecting..." : "Disconnect"}
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  setGmailLoading(true);
                                  const { url } = await getGmailAuthUrl();
                                  window.location.href = url;
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to get auth URL");
                                  setGmailLoading(false);
                                }
                              }}
                              disabled={gmailLoading || !gmailStatus.enabled}
                              className="btn btn-primary text-sm"
                            >
                              {gmailLoading ? "Loading..." : "Connect Gmail"}
                            </button>
                          )}
                        </div>
                      </div>
                      {!gmailStatus.enabled && (
                        <div className="p-3 bg-[var(--warning-light)] border border-[var(--warning)]/30 rounded-lg text-sm text-[var(--warning)]">
                          Gmail integration is disabled. Set GMAIL_ENABLED=true in backend/.env to enable.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Configuration */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">API Configuration</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                        <div className="font-medium text-[var(--foreground)] mb-1">API Base URL</div>
                        <div className="text-sm text-[var(--muted)] font-mono">
                          {getApiBase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Tickets Modal (global, accessible from Tickets tab) */}
      {selectedCustomer && (
        <TicketsModal
          isOpen={showTicketsModal}
          onClose={() => setShowTicketsModal(false)}
          customerId={selectedCustomer.id}
          onTicketsChanged={() => {
            if (selectedCustomer) {
              loadTickets(selectedCustomer.id);
            }
          }}
        />
      )}
    </div>
  );
}

// Modal Component
function StepDetailsModal({
  isOpen,
  onClose,
  stepDetails,
  agentRunId,
  onActionExecuted,
}: {
  isOpen: boolean;
  onClose: () => void;
  stepDetails: StepDetails | null;
  agentRunId: number | null;
  onActionExecuted: (result: Record<string, unknown>) => void;
}) {
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  // Store executed action output as a plain object for safe rendering
  const [localOutput, setLocalOutput] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setExecuteError(null);
    setLocalOutput(null);
  }, [isOpen, stepDetails]);

  if (!isOpen || !stepDetails) return null;

  const { step, auditLog } = stepDetails;

  const parseJson = (jsonStr: string | null): unknown => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return jsonStr;
    }
  };

  const inputData = auditLog ? parseJson(auditLog.tool_input_json) : step.params;
  const outputData = localOutput || (auditLog ? parseJson(auditLog.tool_output_json) : null);
  const isExecuted = !!auditLog || !!localOutput;
  const canExecute = step.type === "write" && !isExecuted && agentRunId;

  async function handleExecuteAction() {
    if (!agentRunId || executing) return;

    try {
      setExecuting(true);
      setExecuteError(null);
      const response = await executeAgentAction(agentRunId, step.action, step.params);
      
      if (response.success) {
        setLocalOutput(response.result);
        onActionExecuted(response.result);
      } else {
        setExecuteError("Action failed: " + JSON.stringify(response.result));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setExecuteError(errorMsg);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="card w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] capitalize">
              {step.action.replace(/_/g, " ")}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[var(--muted)]">Step {step.step}</span>
              <span className={`badge ${step.type === "write" ? "badge-warning" : "badge-primary"}`}>
                {step.type.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 -mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Description</h3>
            <p className="text-sm text-[var(--muted)]">{step.description}</p>
          </div>

          {Boolean(auditLog || localOutput) && (
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Status</h3>
              <span className={`badge ${auditLog?.success !== false ? "badge-success" : "badge-danger"}`}>
                {auditLog?.success !== false ? "✓ Executed" : "✗ Failed"}
              </span>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">Input Parameters</h3>
            {inputData ? (
              <pre className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--foreground)] overflow-x-auto font-mono">
                {JSON.stringify(inputData, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-[var(--muted)] italic">No input parameters</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">Output</h3>
            {outputData ? (
              <pre className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--foreground)] overflow-x-auto max-h-64 overflow-y-auto font-mono">
                {JSON.stringify(outputData, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-[var(--muted)] italic">
                {step.type === "write" ? "Write action not executed yet." : "No output available."}
              </p>
            )}
        </div>

          {executeError && (
            <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-lg text-sm text-[var(--danger)]">
              {executeError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-between gap-3">
          {canExecute ? (
            <button onClick={handleExecuteAction} disabled={executing} className="btn bg-orange-500 hover:bg-orange-600 text-white">
              {executing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Execute Action
                </>
              )}
            </button>
          ) : (
            <div />
          )}
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Tickets Modal Component
function TicketsModal({
  isOpen,
  onClose,
  customerId,
  onTicketsChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  onTicketsChanged: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("open");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, statusFilter, customerId]);

  async function loadTickets() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerTickets(customerId, statusFilter);
      setTickets(data.tickets);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseTicket(ticket: Ticket) {
    try {
      setClosing(true);
      setError(null);
      const updatedTicket = await closeTicket(ticket.id);
      
      if (statusFilter === "open") {
        setTickets(prev => prev.filter(t => t.id !== ticket.id));
      } else {
        setTickets(prev => prev.map(t => t.id === ticket.id ? updatedTicket : t));
      }
      
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(updatedTicket);
      }
      
      onTicketsChanged();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setClosing(false);
    }
  }

  if (!isOpen) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "badge-danger";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium": return "badge-warning";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "badge-primary";
      case "in_progress": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "closed": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="card w-full max-w-4xl h-[85vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Customer Tickets</h2>
            <p className="text-sm text-[var(--muted)]">
              {tickets.length} {statusFilter !== "all" ? statusFilter : ""} ticket{tickets.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 -mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[var(--border)] px-4">
          {(["open", "closed", "all"] as TicketStatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setSelectedTicket(null);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
                statusFilter === status
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tickets List */}
          <div className="w-full sm:w-1/2 border-r border-[var(--border)] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton h-20 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-[var(--danger)]">{error}</div>
            ) : tickets.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[var(--muted)]">
                No {statusFilter !== "all" ? statusFilter : ""} tickets found
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedTicket?.id === ticket.id 
                        ? "bg-[var(--primary-light)]" 
                        : "hover:bg-[var(--background)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-medium text-[var(--foreground)] text-sm">
                        #{ticket.id}: {ticket.title}
                      </span>
                      <span className={`badge shrink-0 ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`badge ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      {ticket.category && (
                        <span className="text-[var(--muted)]">{ticket.category}</span>
                      )}
                      <span className="text-[var(--muted-light)]">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="hidden sm:block w-1/2 p-4 overflow-y-auto">
            {selectedTicket ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-[var(--muted)]">Ticket #{selectedTicket.id}</span>
                    <span className={`badge ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    {selectedTicket.title}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="text-[var(--muted)] text-xs mb-1">Priority</div>
                    <span className={`badge ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="text-[var(--muted)] text-xs mb-1">Category</div>
                    <span className="text-sm text-[var(--foreground)]">
                      {selectedTicket.category || "—"}
                    </span>
                  </div>
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="text-[var(--muted)] text-xs mb-1">Created</div>
                    <span className="text-sm text-[var(--foreground)]">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="text-[var(--muted)] text-xs mb-1">Updated</div>
                    <span className="text-sm text-[var(--foreground)]">
                      {new Date(selectedTicket.updated_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedTicket.closed_at && (
                    <div className="bg-[var(--background)] rounded-lg p-3 col-span-2">
                      <div className="text-[var(--muted)] text-xs mb-1">Closed At</div>
                      <span className="text-sm text-[var(--foreground)]">
                        {new Date(selectedTicket.closed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--background)] rounded-lg p-3">
                  <div className="text-[var(--muted)] text-xs mb-2">Description</div>
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                    {selectedTicket.description || "No description provided"}
                  </p>
                </div>

                {selectedTicket.status !== "closed" && (
                  <button
                    onClick={() => handleCloseTicket(selectedTicket)}
                    disabled={closing}
                    className="w-full btn bg-[var(--danger)] hover:bg-red-600 text-white"
                  >
                    {closing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Close Ticket
                      </>
                    )}
                  </button>
                )}

                {error && (
                  <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-lg text-sm text-[var(--danger)]">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--muted)]">
                Select a ticket to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Gmail Button Component
function GmailButton({
  gmailStatus,
  onStatusChange,
  loading,
  setLoading,
}: {
  gmailStatus: GmailStatus;
  onStatusChange: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    try {
      setLoading(true);
      setError(null);
      const authData = await getGmailAuthUrl();
      // Open OAuth popup
      const popup = window.open(
        authData.url,
        'gmail_oauth',
        'width=500,height=600,scrollbars=yes'
      );
      
      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          onStatusChange();
          setLoading(false);
        }
      }, 500);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    try {
      setLoading(true);
      await disconnectGmail();
      onStatusChange();
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to disconnect Gmail:', err);
    } finally {
      setLoading(false);
    }
  }

  // Gmail not enabled in backend
  if (!gmailStatus.enabled && !gmailStatus.connected) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => gmailStatus.connected ? setShowMenu(!showMenu) : handleConnect()}
        disabled={loading}
        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          gmailStatus.connected
            ? "bg-[var(--success-light)] text-[var(--success)] hover:bg-[var(--success)]/20"
            : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
        }`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
          </svg>
        )}
        <span className="hidden lg:inline">
          {gmailStatus.connected ? "Gmail Connected" : "Connect Gmail"}
        </span>
        {gmailStatus.connected && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && gmailStatus.connected && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden animate-scale-in">
            <div className="p-3 border-b border-[var(--border)]">
              <div className="text-xs text-[var(--muted)] mb-1">Connected as</div>
              <div className="text-sm font-medium text-[var(--foreground)] truncate">
                {gmailStatus.email}
              </div>
            </div>
            <div className="p-2">
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect Gmail
              </button>
        </div>
          </div>
        </>
      )}

      {/* Error Toast */}
      {error && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-xl text-sm text-[var(--danger)] z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}

// Support Inbox Component
function SupportInbox({
  customer,
  messages,
  messagesLoading,
  newMessage,
  setNewMessage,
  onSendMessage,
  sending,
  sendError,
  agentRun,
  humanApprovalMode,
  setHumanApprovalMode,
  draftReply,
  setDraftReply,
  onCancelDraft,
  approving,
  setApproving,
  setSendError,
  tickets,
  ticketNotification,
  setTicketNotification,
  onTicketsRefresh,
  agentPanelOpen,
  setAgentPanelOpen,
  gmailStatus,
  setMessages,
}: {
  customer: Customer | null;
  messages: Message[];
  messagesLoading: boolean;
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  sending: boolean;
  sendError: string | null;
  agentRun: AgentRun | null;
  humanApprovalMode: boolean;
  setHumanApprovalMode: (mode: boolean) => void;
  draftReply: DraftReply | null;
  setDraftReply: (draft: DraftReply | null) => void;
  onCancelDraft: () => void;
  approving: boolean;
  setApproving: (approving: boolean) => void;
  setSendError: (error: string | null) => void;
  tickets: Ticket[];
  ticketNotification: string | null;
  setTicketNotification: (notification: string | null) => void;
  onTicketsRefresh: () => void;
  agentPanelOpen: boolean;
  setAgentPanelOpen: (open: boolean) => void;
  gmailStatus: GmailStatus;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}) {
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [approveAction, setApproveAction] = useState<ApproveAction>("chat_only");
  const [emailSubject, setEmailSubject] = useState("");
  const [gmailDraftSuccess, setGmailDraftSuccess] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset Gmail options when draft changes
  useEffect(() => {
    if (draftReply && agentRun) {
      // Generate default subject
      const intent = agentRun.intent || "support_request";
      setEmailSubject(`Re: Support Request - ${intent.replace(/_/g, " ")}`);
    }
  }, [draftReply, agentRun]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draftReply]);

  // Handle approve with Gmail draft option
  async function handleApproveWithOptions() {
    if (!draftReply || !customer || approving) return;

    try {
      setApproving(true);
      setSendError(null);
      setTicketNotification(null);
      setGmailDraftSuccess(null);
      
      const response = await approveMessage(
        customer.id, 
        draftReply.text, 
        approveAction,
        approveAction === "gmail_draft" ? emailSubject : ""
      );
      
      setMessages((prev) => [...prev, response.agent_message]);
      setDraftReply(null);
      
      // Handle Gmail draft success
      if (response.gmail?.success) {
        setGmailDraftSuccess(`Gmail draft created (ID: ${response.gmail.draft_id})`);
        setTimeout(() => setGmailDraftSuccess(null), 5000);
      }
      
      // Handle executed actions
      if (response.executed_actions && response.executed_actions.length > 0) {
        const ticketActions = response.executed_actions.filter(
          (a: ExecutedAction) => a.action === "create_ticket" || a.action === "escalate_to_human"
        );
        if (ticketActions.length > 0) {
          const notifications = ticketActions.map((a: ExecutedAction) => {
            if (a.result.ticket_id) {
              return `Ticket created: #${a.result.ticket_id}`;
            }
            return a.result.message || "Action executed";
          });
          setTicketNotification(notifications.join(", "));
          onTicketsRefresh();
          setTimeout(() => setTicketNotification(null), 5000);
        }
      }
      
      // Reset approve action
      setApproveAction("chat_only");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setSendError(errorMsg);
    } finally {
      setApproving(false);
    }
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[var(--background)] to-[var(--card-bg)]">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Welcome to Support Inbox</h2>
          <p className="text-[var(--muted)]">Select a customer from the sidebar to view their conversation and manage support requests.</p>
        </div>
      </div>
    );
  }

  const openTicketsCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
        {/* Professional Header - Enterprise Style */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[var(--card-bg)] to-[var(--background)] border-b border-[var(--border)] shadow-sm backdrop-blur-sm">
          {/* Customer Info Bar */}
          <div className="px-5 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-[var(--primary)]/20">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--success)] rounded-full border-2 border-[var(--card-bg)] ring-1 ring-[var(--success)]/30" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">{customer.name}</h2>
                    {customer.company && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--muted)]">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {customer.company}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted)] font-medium">{customer.email}</p>
                </div>
              </div>

              {/* Actions - Enterprise Style */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowTicketsModal(true)}
                  className="relative btn btn-secondary text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="hidden sm:inline">Tickets</span>
                  {openTicketsCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[var(--danger)] to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg ring-2 ring-[var(--card-bg)]">
                      {openTicketsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="px-4 sm:px-6 py-2 bg-[var(--background)] border-t border-[var(--border)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>{messages.length} messages</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{tickets.length} tickets</span>
              </div>
            </div>

            {/* Human Approval Toggle */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                humanApprovalMode ? "bg-[var(--primary-light)]" : "bg-transparent"
              }`}>
                <svg className={`w-4 h-4 ${humanApprovalMode ? "text-[var(--primary)]" : "text-[var(--muted)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className={`text-sm font-medium ${humanApprovalMode ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>
                  Human Review
                </span>
                <div 
                  className={`toggle ${humanApprovalMode ? 'active' : ''} ${draftReply ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !draftReply && setHumanApprovalMode(!humanApprovalMode)}
                >
                  <div className="toggle-knob" />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          {ticketNotification && (
            <div className="px-4 sm:px-6 py-2 bg-[var(--success-light)] border-t border-[var(--success)]/20">
              <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{ticketNotification}</span>
              </div>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`skeleton h-20 w-2/3 rounded-2xl ${i % 2 === 0 ? 'rounded-br-md' : 'rounded-bl-md'}`} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 && !draftReply ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">No conversation yet</h3>
                <p className="text-[var(--muted)] text-sm">Send a message to start the conversation with {customer.name}</p>
              </div>
            ) : (
              <>
                {/* Date Separator - could add logic to group by date */}
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--muted)] font-medium">Today</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                {messages.map((msg, idx) => {
                  const isOutbound = msg.direction === "outbound";
                  const showAvatar = idx === 0 || messages[idx - 1]?.direction !== msg.direction;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOutbound ? "flex-row-reverse" : ""} animate-slide-up`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
                        {isOutbound ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="avatar avatar-sm">{customer.name.charAt(0)}</div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {showAvatar && (
                          <span className={`text-xs text-[var(--muted)] mb-1 ${isOutbound ? 'mr-1' : 'ml-1'}`}>
                            {isOutbound ? 'AI Agent' : customer.name}
                          </span>
                        )}
                        <div className={`rounded-2xl px-4 py-3 ${
                          isOutbound 
                            ? "bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white rounded-br-md" 
                            : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-md"
                        }`}>
                          {msg.subject && (
                            <div className={`text-xs font-medium mb-1 ${isOutbound ? "text-white/80" : "text-[var(--muted)]"}`}>
                              {msg.subject}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        </div>
                        <span className={`text-[10px] text-[var(--muted-light)] mt-1 ${isOutbound ? 'mr-1' : 'ml-1'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Draft Reply Preview */}
                {draftReply && (
                  <div className="flex gap-3 flex-row-reverse animate-slide-up">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col items-end max-w-[75%]">
                      <span className="text-xs text-amber-600 dark:text-amber-400 mb-1 mr-1 font-medium">Draft Reply</span>
                      <div className="rounded-2xl rounded-br-md px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-dashed border-amber-400 dark:border-amber-600">
                        <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">{draftReply.text}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Composer Area */}
        <div className="flex-shrink-0 bg-[var(--card-bg)] border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            {sendError && (
              <div className="mb-3 p-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-xl text-sm text-[var(--danger)] flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{sendError}</span>
              </div>
            )}
            
            {draftReply ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="font-medium">Edit AI Response</span>
                  </div>
                  <button onClick={onCancelDraft} disabled={approving} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                    Discard
                  </button>
                </div>
                
                {/* Proposed Actions */}
                {draftReply.pendingWrites && draftReply.pendingWrites.length > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wide mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Actions to Execute
                    </div>
                    <div className="space-y-1">
                      {draftReply.pendingWrites.map((pw) => (
                        <div key={pw.step} className="flex items-center gap-2 text-sm">
                          <span className="badge badge-warning">PENDING</span>
                          <span className="text-orange-800 dark:text-orange-200">{pw.action.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <textarea
                    value={draftReply.text}
                    onChange={(e) => setDraftReply({ ...draftReply, text: e.target.value })}
                    disabled={approving}
                    className="w-full px-4 py-3 bg-[var(--background)] border-2 border-amber-400 dark:border-amber-600 rounded-xl text-[var(--foreground)] text-sm resize-none focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                    rows={4}
                    placeholder="Edit the response..."
                  />
                </div>

                {/* Gmail Draft Option */}
                {gmailStatus.connected && (
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="gmail-draft-checkbox"
                        checked={approveAction === "gmail_draft"}
                        onChange={(e) => setApproveAction(e.target.checked ? "gmail_draft" : "chat_only")}
                        className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <label htmlFor="gmail-draft-checkbox" className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                        Also create Gmail draft to <span className="font-medium">{customer.email}</span>
                      </label>
                    </div>
                    
                    {approveAction === "gmail_draft" && (
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-1">Email Subject</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Re: Support Request"
                          className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Gmail Draft Success Message */}
                {gmailDraftSuccess && (
                  <div className="p-3 bg-[var(--success-light)] border border-[var(--success)]/20 rounded-xl text-sm text-[var(--success)] flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                    </svg>
                    {gmailDraftSuccess}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--muted)]">
                    {approveAction === "gmail_draft" 
                      ? "Will save to chat and create Gmail draft" 
                      : "Will save to chat only"}
                  </div>
                  <button
                    onClick={handleApproveWithOptions}
                    disabled={!draftReply.text.trim() || approving || (approveAction === "gmail_draft" && !emailSubject.trim())}
                    className="btn bg-[var(--success)] hover:bg-green-600 text-white px-6"
                  >
                    {approving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {approveAction === "gmail_draft" ? "Creating..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        {approveAction === "gmail_draft" ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {approveAction === "gmail_draft" ? "Approve & Create Draft" : "Approve & Send"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${customer.name}...`}
                  disabled={sending}
                  className="w-full pl-4 pr-14 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-sm resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50 transition-all"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={onSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="absolute right-2 bottom-2 w-9 h-9 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Panel - Desktop */}
      <div className="hidden lg:block">
        <AgentPanel 
          agentRun={agentRun} 
          humanApprovalMode={humanApprovalMode}
          onActionExecuted={onTicketsRefresh}
        />
      </div>

      {/* Agent Panel - Mobile Overlay */}
      {agentPanelOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => setAgentPanelOpen(false)}
          />
          <div className="lg:hidden fixed right-0 top-14 bottom-0 z-50 animate-slide-left">
            <AgentPanel 
              agentRun={agentRun} 
              humanApprovalMode={humanApprovalMode}
              onActionExecuted={onTicketsRefresh}
              onClose={() => setAgentPanelOpen(false)}
            />
          </div>
        </>
      )}

      {/* Tickets Modal */}
      <TicketsModal
        isOpen={showTicketsModal}
        onClose={() => setShowTicketsModal(false)}
        customerId={customer.id}
        onTicketsChanged={onTicketsRefresh}
      />
    </div>
  );
}

// Agent Panel Component
function AgentPanel({ 
  agentRun, 
  humanApprovalMode,
  onActionExecuted,
  onClose,
}: { 
  agentRun: AgentRun | null;
  humanApprovalMode: boolean;
  onActionExecuted?: () => void;
  onClose?: () => void;
}) {
  const [selectedStep, setSelectedStep] = useState<StepDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [executedSteps, setExecutedSteps] = useState<Set<string>>(new Set());

  if (!agentRun) {
    return (
      <aside className="w-72 xl:w-80 h-full border-l border-[var(--border)] bg-[var(--card-bg)] p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Agent Activity
          </h3>
          {onClose && (
            <button onClick={onClose} className="lg:hidden btn btn-ghost p-1.5 -mr-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--background)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">Send a message to see agent activity</p>
        </div>
      </aside>
    );
  }

  let plan: PlanStep[] = [];
  try {
    plan = JSON.parse(agentRun.plan_json);
  } catch {
    plan = [];
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-[var(--success)]";
    if (confidence >= 0.5) return "text-[var(--warning)]";
    return "text-[var(--danger)]";
  };

  const findAuditLog = (step: PlanStep): AuditLog | null => {
    return agentRun.audit_logs.find(log => log.tool_name === step.action) || null;
  };

  const isStepExecuted = (step: PlanStep): boolean => {
    return executedSteps.has(step.action) || findAuditLog(step) !== null;
  };

  const handleStepClick = (step: PlanStep) => {
    const auditLog = findAuditLog(step);
    setSelectedStep({ step, auditLog });
    setModalOpen(true);
  };

  const handleActionExecuted = (result: Record<string, unknown>) => {
    if (selectedStep) {
      setExecutedSteps(prev => new Set(prev).add(selectedStep.step.action));
    }
    if (onActionExecuted) {
      onActionExecuted();
    }
  };

  return (
    <>
      <aside className="w-72 xl:w-80 h-full border-l border-[var(--border)] bg-[var(--card-bg)] p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Agent Activity
          </h3>
          {onClose && (
            <button onClick={onClose} className="lg:hidden btn btn-ghost p-1.5 -mr-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Intent & Confidence */}
        <div className="card p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted)]">Intent</span>
            <span className={`text-sm font-semibold ${getConfidenceColor(agentRun.confidence)}`}>
              {Math.round(agentRun.confidence * 100)}%
            </span>
          </div>
          <div className="font-medium text-[var(--foreground)] capitalize">
            {agentRun.intent.replace(/_/g, " ")}
          </div>
        </div>

        {/* Plan */}
        <div className="mb-4">
          <div className="text-xs text-[var(--muted)] mb-2">Execution Plan</div>
          <div className="space-y-2">
            {plan.map((step) => {
              const isWrite = step.type === "write";
              const executed = isStepExecuted(step);
              const isPending = isWrite && !executed && humanApprovalMode;
              
              return (
                <button
                  key={step.step}
                  onClick={() => handleStepClick(step)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all hover:shadow-sm ${
                    executed && isWrite
                      ? "border-[var(--success)] bg-[var(--success-light)]"
                      : isPending
                      ? "border-[var(--warning)] bg-[var(--warning-light)]"
                      : isWrite
                      ? "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
                      : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[var(--foreground)]">
                      {step.step}. {step.action.replace(/_/g, " ")}
                    </span>
                    <span className={`badge text-[10px] ${
                      executed
                        ? "badge-success"
                        : isPending
                        ? "badge-warning"
                        : isWrite
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "badge-primary"
                    }`}>
                      {executed ? "✓ DONE" : isPending ? "PENDING" : step.type === "read" ? "VIEW" : "EXECUTE"}
                    </span>
                  </div>
                  <div className="text-[var(--muted)] line-clamp-2">{step.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Logs */}
        <div>
          <div className="text-xs text-[var(--muted)] mb-2">Audit Log</div>
          {agentRun.audit_logs.length === 0 ? (
            <div className="text-xs text-[var(--muted-light)] italic text-center py-4">
              No tools executed yet
            </div>
          ) : (
            <div className="space-y-1">
              {agentRun.audit_logs.map((log) => {
                const matchingStep = plan.find(s => s.action === log.tool_name);
                
                return (
                  <button
                    key={log.id}
                    onClick={() => {
                      if (matchingStep) {
                        setSelectedStep({ step: matchingStep, auditLog: log });
                        setModalOpen(true);
                      }
                    }}
                    className="flex items-center justify-between p-2 bg-[var(--background)] rounded-lg text-xs w-full text-left hover:bg-[var(--border)] transition-colors"
                  >
                    <span className="text-[var(--foreground)] font-medium truncate">
                      {log.tool_name.replace(/_/g, " ")}
                    </span>
                    <span className={`badge ${log.success ? "badge-success" : "badge-danger"}`}>
                      {log.success ? "✓" : "✗"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <StepDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        stepDetails={selectedStep}
        agentRunId={agentRun.id}
        onActionExecuted={handleActionExecuted}
      />
    </>
  );
}

// Mini Bar Chart Component
function MiniBarChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data);
  return (
    <div>
      <div className="text-xs text-[var(--muted)] mb-2">{label}</div>
      <div className="flex items-end gap-1 h-12">
        {data.map((value, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t transition-all duration-300 ${color}`}
            style={{ height: `${(value / max) * 100}%`, minHeight: '4px' }}
            title={`${value}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted-light)] mt-1">
        <span>7d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// Circular Progress Component
function CircularProgress({ value, size = 60, strokeWidth = 6, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-[var(--border)]"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-[var(--foreground)]">{value}</span>
      </div>
    </div>
  );
}

// Success Dashboard Component
function SuccessDashboard({
  customers,
  selectedCustomer,
  onSelectCustomer,
  loading,
  error,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  loading: boolean;
  error: string | null;
}) {
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  // Extended health data with charts data
  const healthData: Record<number, { 
    status: string; 
    score: number; 
    reasons: string;
    engagement: number[];
    tickets: number[];
    logins: number[];
    nps: number;
    responseTime: string;
    lastActivity: string;
    mrr: string;
    plan: string;
  }> = {
    1: { 
      status: "Healthy", 
      score: 85, 
      reasons: "Active engagement, recent purchase",
      engagement: [65, 72, 68, 80, 85, 78, 92],
      tickets: [2, 1, 0, 1, 0, 0, 1],
      logins: [5, 4, 6, 5, 7, 8, 6],
      nps: 9,
      responseTime: "< 2 hours",
      lastActivity: "2 hours ago",
      mrr: "$299",
      plan: "Enterprise"
    },
    2: { 
      status: "At Risk", 
      score: 45, 
      reasons: "No login in 14 days",
      engagement: [45, 38, 32, 28, 20, 15, 10],
      tickets: [3, 4, 2, 5, 3, 2, 0],
      logins: [3, 2, 1, 0, 0, 0, 0],
      nps: 4,
      responseTime: "24+ hours",
      lastActivity: "14 days ago",
      mrr: "$49",
      plan: "Starter"
    },
    3: { 
      status: "Healthy", 
      score: 92, 
      reasons: "Enterprise customer, high usage",
      engagement: [88, 90, 85, 92, 95, 91, 94],
      tickets: [0, 1, 0, 0, 1, 0, 0],
      logins: [12, 15, 14, 18, 20, 16, 19],
      nps: 10,
      responseTime: "< 1 hour",
      lastActivity: "30 mins ago",
      mrr: "$999",
      plan: "Enterprise Plus"
    },
    4: { 
      status: "Needs Attention", 
      score: 60, 
      reasons: "Open support ticket",
      engagement: [55, 58, 62, 55, 48, 52, 60],
      tickets: [1, 2, 3, 2, 4, 3, 2],
      logins: [4, 3, 4, 5, 3, 4, 5],
      nps: 6,
      responseTime: "4-6 hours",
      lastActivity: "1 day ago",
      mrr: "$149",
      plan: "Professional"
    },
    5: { 
      status: "Healthy", 
      score: 78, 
      reasons: "Regular activity",
      engagement: [70, 72, 68, 75, 80, 76, 78],
      tickets: [1, 0, 1, 0, 0, 1, 0],
      logins: [6, 7, 5, 8, 7, 6, 8],
      nps: 8,
      responseTime: "< 4 hours",
      lastActivity: "5 hours ago",
      mrr: "$199",
      plan: "Professional"
    },
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Healthy": return "badge-success";
      case "At Risk": return "badge-danger";
      case "Needs Attention": return "badge-warning";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-[var(--success)]";
    if (score >= 50) return "text-[var(--warning)]";
    return "text-[var(--danger)]";
  };

  const toggleExpand = (customerId: number) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
    onSelectCustomer(customers.find(c => c.id === customerId) || customers[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--muted)]">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="card p-6 max-w-lg border-[var(--danger)]">
          <h3 className="text-[var(--danger)] font-semibold mb-2">Failed to load customers</h3>
          <p className="text-sm text-[var(--muted)] whitespace-pre-wrap break-words">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Customer Success Dashboard</h2>
        <p className="text-sm text-[var(--muted)] mt-1">Monitor customer health and engagement metrics</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Total Customers</div>
          <div className="text-2xl font-bold text-[var(--foreground)] mt-1">{customers.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Healthy</div>
          <div className="text-2xl font-bold text-[var(--success)] mt-1">
            {Object.values(healthData).filter(h => h.status === "Healthy").length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">At Risk</div>
          <div className="text-2xl font-bold text-[var(--danger)] mt-1">
            {Object.values(healthData).filter(h => h.status === "At Risk").length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Avg. Score</div>
          <div className="text-2xl font-bold text-[var(--primary)] mt-1">
            {Math.round(Object.values(healthData).reduce((acc, h) => acc + h.score, 0) / Object.values(healthData).length)}
          </div>
        </div>
      </div>

      {/* Customer Cards */}
      <div className="space-y-4">
        {customers.map((customer) => {
          const health = healthData[customer.id] || { 
            status: "Unknown", score: 0, reasons: "No data",
            engagement: [0,0,0,0,0,0,0], tickets: [0,0,0,0,0,0,0], logins: [0,0,0,0,0,0,0],
            nps: 0, responseTime: "N/A", lastActivity: "N/A", mrr: "$0", plan: "Free"
          };
          const isExpanded = expandedCustomer === customer.id;

          return (
            <div key={customer.id} className="card overflow-hidden transition-all duration-300">
              {/* Card Header - Always Visible */}
              <button
                onClick={() => toggleExpand(customer.id)}
                className={`w-full text-left p-4 sm:p-5 transition-colors hover:bg-[var(--background)] ${
                  isExpanded ? "bg-[var(--background)]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="avatar avatar-md flex-shrink-0">{customer.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--foreground)]">{customer.name}</span>
                        <span className={`badge ${getStatusBadge(health.status)}`}>{health.status}</span>
                      </div>
                      <div className="text-sm text-[var(--muted)] truncate">{customer.company || customer.email}</div>
                    </div>
                  </div>

                  {/* Quick Stats - Desktop */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-[var(--muted)]">Score</div>
                      <div className={`text-lg font-bold ${getScoreColor(health.score)}`}>{health.score}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-[var(--muted)]">MRR</div>
                      <div className="text-lg font-bold text-[var(--foreground)]">{health.mrr}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-[var(--muted)]">Plan</div>
                      <div className="text-sm font-medium text-[var(--foreground)]">{health.plan}</div>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <svg 
                    className={`w-5 h-5 text-[var(--muted)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] p-4 sm:p-5 animate-slide-up">
                  {/* Mobile Stats Row */}
                  <div className="sm:hidden grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-[var(--background)] rounded-lg">
                      <div className="text-xs text-[var(--muted)]">Score</div>
                      <div className={`text-lg font-bold ${getScoreColor(health.score)}`}>{health.score}</div>
                    </div>
                    <div className="text-center p-2 bg-[var(--background)] rounded-lg">
                      <div className="text-xs text-[var(--muted)]">MRR</div>
                      <div className="text-lg font-bold text-[var(--foreground)]">{health.mrr}</div>
                    </div>
                    <div className="text-center p-2 bg-[var(--background)] rounded-lg">
                      <div className="text-xs text-[var(--muted)]">Plan</div>
                      <div className="text-sm font-medium text-[var(--foreground)]">{health.plan}</div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
                    <div className="bg-[var(--background)] rounded-lg p-4">
                      <MiniBarChart 
                        data={health.engagement} 
                        color="bg-[var(--primary)]" 
                        label="Engagement Score (7 days)" 
                      />
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-4">
                      <MiniBarChart 
                        data={health.logins} 
                        color="bg-[var(--success)]" 
                        label="Login Activity (7 days)" 
                      />
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-4">
                      <MiniBarChart 
                        data={health.tickets} 
                        color="bg-[var(--warning)]" 
                        label="Support Tickets (7 days)" 
                      />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div className="bg-[var(--background)] rounded-lg p-3 sm:p-4 flex items-center gap-3">
                      <CircularProgress 
                        value={health.nps * 10} 
                        size={50} 
                        strokeWidth={5}
                        color={health.nps >= 7 ? "text-[var(--success)]" : health.nps >= 5 ? "text-[var(--warning)]" : "text-[var(--danger)]"}
                      />
                      <div>
                        <div className="text-xs text-[var(--muted)]">NPS Score</div>
                        <div className="text-lg font-bold text-[var(--foreground)]">{health.nps}/10</div>
                      </div>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-3 sm:p-4">
                      <div className="text-xs text-[var(--muted)]">Avg Response Time</div>
                      <div className="text-lg font-bold text-[var(--foreground)] mt-1">{health.responseTime}</div>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-3 sm:p-4">
                      <div className="text-xs text-[var(--muted)]">Last Activity</div>
                      <div className="text-lg font-bold text-[var(--foreground)] mt-1">{health.lastActivity}</div>
                    </div>
                    <div className="bg-[var(--background)] rounded-lg p-3 sm:p-4">
                      <div className="text-xs text-[var(--muted)]">Customer Since</div>
                      <div className="text-lg font-bold text-[var(--foreground)] mt-1">
                        {new Date(customer.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>

                  {/* Insights */}
                  <div className="bg-[var(--primary-light)] rounded-lg p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--primary)]">AI Insight</div>
                      <p className="text-sm text-[var(--foreground)] mt-1">{health.reasons}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
