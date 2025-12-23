"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getCustomerMessages, getCustomerTickets, sendCustomerMessage, type Customer, type Message, type Ticket } from "@/lib/api";

function CustomerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams?.get("customerId");
  const initialTab = searchParams?.get("tab") || "chat";

  const [activeTab, setActiveTab] = useState<"chat" | "tickets">(initialTab === "tickets" ? "tickets" : "chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (customerId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId && activeTab === "tickets") {
      loadTickets();
    }
  }, [customerId, activeTab]);

  async function loadData() {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);
      const [messagesData, ticketsData] = await Promise.all([
        getCustomerMessages(Number(customerId)),
        getCustomerTickets(Number(customerId)),
      ]);
      setMessages(messagesData);
      setTickets(ticketsData.tickets);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function loadTickets() {
    if (!customerId) return;
    try {
      const ticketsData = await getCustomerTickets(Number(customerId));
      setTickets(ticketsData.tickets);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load tickets";
      setError(errorMsg);
    }
  }

  async function handleSendMessage() {
    if (!customerId || !messageText.trim()) return;
    try {
      setSending(true);
      setError(null);
      await sendCustomerMessage(Number(customerId), messageText.trim(), false);
      setMessageText("");
      await loadData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMsg);
    } finally {
      setSending(false);
    }
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="empty-state max-w-md">
            <div className="empty-state-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="empty-state-title">Customer ID Required</h3>
            <p className="empty-state-description mb-6">
              Please select a customer from the guest portal to continue.
            </p>
            <Link href="/customer/guest" className="btn btn-primary">
              Go to Customer Portal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Header />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                  Customer Portal
                </h1>
                <Link
                  href="/customer/guest"
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  ← Back to Customers
                </Link>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "chat"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab("tickets")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "tickets"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Tickets ({tickets.length})
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="p-4 bg-[var(--danger-light)] border-b border-[var(--border)]">
                <p className="text-sm text-[var(--danger)]">{error}</p>
              </div>
            )}

            {/* Content */}
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="loading-state py-12">
                  <div className="loading-spinner"></div>
                  <p className="text-sm text-[var(--muted)] mt-4">Loading...</p>
                </div>
              ) : activeTab === "chat" ? (
                /* Chat Tab */
                <div className="flex flex-col h-[600px]">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="empty-state py-12">
                        <div className="empty-state-icon">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="empty-state-description">No messages yet. Start a conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === "inbound" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.direction === "inbound"
                                ? "bg-[var(--background)] border border-[var(--border)]"
                                : "bg-[var(--primary)] text-white"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.direction === "inbound" ? "text-[var(--muted)]" : "text-white/70"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 input"
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !messageText.trim()}
                      className="btn btn-primary"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Tickets Tab */
                <div>
                  {tickets.length === 0 ? (
                    <div className="empty-state py-12">
                      <div className="empty-state-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="empty-state-description">No tickets found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">
                              {ticket.title}
                            </h3>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                ticket.status === "closed"
                                  ? "bg-[var(--muted)] text-[var(--foreground)]"
                                  : ticket.status === "in_progress"
                                  ? "bg-[var(--warning-light)] text-[var(--warning)]"
                                  : "bg-[var(--success-light)] text-[var(--success)]"
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--muted)] mb-3">{ticket.description}</p>
                          <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                            <span>Priority: {ticket.priority}</span>
                            <span>Category: {ticket.category}</span>
                            <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="text-sm text-[var(--muted)] mt-4">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <CustomerPortalContent />
    </Suspense>
  );
}
