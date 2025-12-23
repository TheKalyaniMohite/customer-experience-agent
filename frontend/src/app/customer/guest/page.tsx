"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Ticket,
  MessageCircle,
  BookOpen,
  User,
  Settings,
  Menu,
  X,
} from "lucide-react";
import {
  fetchCustomerTickets,
  fetchCustomerMessages,
  createCustomerMessage,
  seedDemo,
  Ticket as TicketType,
  Message,
  TicketStatusFilter,
} from "@/lib/api";

const DEMO_CUSTOMER_ID = 2; // Bob Smith

type Tab = "tickets" | "chat" | "knowledge" | "profile" | "settings";

export default function CustomerGuestPortal() {
  const [activeTab, setActiveTab] = useState<Tab>("tickets");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<TicketStatusFilter>("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Reload tickets when filter changes
  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    }
  }, [ticketFilter, activeTab]);

  // Load messages when ticket is selected or chat tab is active
  useEffect(() => {
    if (activeTab === "chat" || (activeTab === "tickets" && selectedTicket)) {
      loadMessages();
    }
  }, [activeTab, selectedTicket]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([loadTickets(), loadMessages()]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function loadTickets() {
    try {
      setTicketsLoading(true);
      const { tickets: data } = await fetchCustomerTickets(DEMO_CUSTOMER_ID, ticketFilter);
      setTickets(data);
      // Auto-select first ticket if none selected
      if (data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load tickets";
      setError(errorMsg);
    } finally {
      setTicketsLoading(false);
    }
  }

  async function loadMessages() {
    try {
      setMessagesLoading(true);
      const data = await fetchCustomerMessages(DEMO_CUSTOMER_ID);
      setMessages(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load messages";
      setError(errorMsg);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      setSendError(null);
      await createCustomerMessage(DEMO_CUSTOMER_ID, newMessage.trim());
      setNewMessage("");
      // Reload messages to get the new one and any agent response
      setTimeout(() => {
        loadMessages();
        loadTickets(); // Refresh tickets in case a new one was created
      }, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message";
      setSendError(errorMsg);
    } finally {
      setSending(false);
    }
  }

  async function handleSeed() {
    try {
      setSeeding(true);
      setError(null);
      await seedDemo();
      await loadData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to seed demo data";
      setError(errorMsg);
    } finally {
      setSeeding(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(date);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-[var(--danger)] text-white";
      case "medium":
        return "bg-[var(--warning)] text-white";
      case "low":
        return "bg-[var(--muted)] text-[var(--foreground)]";
      default:
        return "bg-[var(--muted)] text-[var(--foreground)]";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
      case "in_progress":
        return "bg-[var(--success)] text-white";
      case "closed":
        return "bg-[var(--muted)] text-[var(--foreground)]";
      default:
        return "bg-[var(--muted)] text-[var(--foreground)]";
    }
  };

  const navItems: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "tickets", label: "Tickets", icon: <Ticket className="w-5 h-5" /> },
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "knowledge", label: "Knowledge Base", icon: <BookOpen className="w-5 h-5" /> },
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const isEmpty = !loading && tickets.length === 0 && messages.length === 0;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--background)]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--success)] to-green-600 flex items-center justify-center shadow-md">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Customer Portal (Guest)</h1>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-[var(--danger-light)] border-b border-[var(--danger)]/20 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[var(--danger)] hover:text-[var(--danger)]/80"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
              <p className="text-[var(--muted)]">Loading...</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="card p-8 sm:p-12 max-w-md text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--success)] to-green-600 flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                Welcome to Customer Portal
              </h2>
              <p className="text-[var(--muted)] mb-8">
                No messages or tickets yet. Click below to seed demo data and get started.
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="btn btn-primary w-full"
              >
                {seeding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Seeding...
                  </>
                ) : (
                  "Seed Demo Data"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col lg:flex-row">
            {/* Left: Tickets Panel */}
            {activeTab === "tickets" && (
              <aside className="w-full lg:w-80 xl:w-96 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col">
                <div className="p-4 border-b border-[var(--border)]">
                  <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                    My Tickets
                  </h2>
                  {/* Tabs */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTicketFilter("open")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        ticketFilter === "open"
                          ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setTicketFilter("closed")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        ticketFilter === "closed"
                          ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Closed
                    </button>
                    <button
                      onClick={() => setTicketFilter("all")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        ticketFilter === "all"
                          ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* Tickets List */}
                <div className="flex-1 overflow-y-auto">
                  {ticketsLoading ? (
                    <div className="p-4 text-center text-[var(--muted)] text-sm">Loading tickets...</div>
                  ) : tickets.length === 0 ? (
                    <div className="p-4 text-center text-[var(--muted)] text-sm">
                      No {ticketFilter === "all" ? "" : ticketFilter} tickets
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--border)]">
                      {tickets.map((ticket) => (
                        <li key={ticket.id}>
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className={`w-full p-4 text-left hover:bg-[var(--background)] transition-colors ${
                              selectedTicket?.id === ticket.id ? "bg-[var(--background)]" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-sm font-medium text-[var(--foreground)] line-clamp-2 flex-1">
                                {ticket.title}
                              </h3>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(ticket.status)}`}>
                                  {ticket.status}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-[var(--muted)] line-clamp-2 mb-2">
                              {ticket.description}
                            </p>
                            <div className="text-xs text-[var(--muted-light)]">
                              {formatDate(ticket.created_at)}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Selected Ticket Details */}
                {selectedTicket && (
                  <div className="border-t border-[var(--border)] p-4 bg-[var(--background)]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">Ticket Details</h3>
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[var(--muted)]">Title:</span>
                        <p className="text-[var(--foreground)]">{selectedTicket.title}</p>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">Description:</span>
                        <p className="text-[var(--foreground)]">{selectedTicket.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status}
                        </span>
                        {selectedTicket.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)]">
                            {selectedTicket.category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        Created: {formatDate(selectedTicket.created_at)}
                        {selectedTicket.closed_at && (
                          <> • Closed: {formatDate(selectedTicket.closed_at)}</>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            )}

            {/* Right: Chat Panel */}
            {activeTab === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
                  <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Support Chat
                  </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-[var(--muted)] text-sm">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-[var(--muted)] text-sm py-8">
                      No messages yet. Start a conversation!
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isCustomer = message.direction === "inbound";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-3 ${
                              isCustomer
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)]"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                            <div
                              className={`text-xs mt-2 ${
                                isCustomer ? "text-white/70" : "text-[var(--muted)]"
                              }`}
                            >
                              {formatDate(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Error */}
                {sendError && (
                  <div className="px-4 py-2 bg-[var(--danger-light)] border-t border-[var(--danger)]/20">
                    <p className="text-sm text-[var(--danger)]">{sendError}</p>
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--sidebar-bg)]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        "Send"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets Tab - Main Content with Message History */}
            {activeTab === "tickets" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Message History for Selected Ticket */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedTicket ? (
                    <div className="max-w-3xl mx-auto">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                          {selectedTicket.title}
                        </h2>
                        <div className="flex gap-2 mb-4">
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(selectedTicket.priority)}`}>
                            {selectedTicket.priority}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedTicket.status)}`}>
                            {selectedTicket.status}
                          </span>
                        </div>
                        <p className="text-[var(--muted)] mb-4">{selectedTicket.description}</p>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
                          Message History
                        </h3>
                        {messagesLoading ? (
                          <div className="text-center text-[var(--muted)] text-sm">Loading messages...</div>
                        ) : messages.length === 0 ? (
                          <div className="text-center text-[var(--muted)] text-sm py-8">
                            No messages for this ticket yet.
                          </div>
                        ) : (
                          messages.map((message) => {
                            const isCustomer = message.direction === "inbound";
                            return (
                              <div
                                key={message.id}
                                className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    isCustomer
                                      ? "bg-[var(--primary)] text-white"
                                      : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)]"
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                                  <div
                                    className={`text-xs mt-2 ${
                                      isCustomer ? "text-white/70" : "text-[var(--muted)]"
                                    }`}
                                  >
                                    {formatDate(message.created_at)}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[var(--muted)]">
                      <div className="text-center">
                        <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Select a ticket to view message history</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input at Bottom */}
                {selectedTicket && (
                  <div className="p-4 border-t border-[var(--border)] bg-[var(--sidebar-bg)]">
                    {sendError && (
                      <div className="mb-2 p-2 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded text-sm text-[var(--danger)]">
                        {sendError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Send a message about this ticket..."
                        className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        disabled={sending}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          "Send"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Base Tab */}
            {activeTab === "knowledge" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Knowledge Base</h2>
                  <div className="card p-8 text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-[var(--muted)] opacity-50" />
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Coming soon</h3>
                    <p className="text-[var(--muted)]">
                      Knowledge base search will be available here.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Profile</h2>
                  <div className="card p-6">
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--success)] to-green-600 flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">Guest User</h3>
                      <p className="text-sm text-[var(--muted)]">Demo Mode</p>
                    </div>
                    <p className="text-sm text-[var(--muted)] text-center">
                      Profile management coming soon. Please log in to access full profile features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Settings</h2>
                  <div className="card p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                        Notifications
                      </h3>
                      <p className="text-sm text-[var(--muted)]">
                        Notification settings will be available after logging in.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                        Preferences
                      </h3>
                      <p className="text-sm text-[var(--muted)]">
                        User preferences will be available after logging in.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
