"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">CX Agent</h1>
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors font-medium"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-8">
              About CX Agent
            </h2>

            {/* What the app does */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">What It Does</h3>
              <p className="text-[var(--foreground)] leading-relaxed mb-4">
                CX Agent is an AI-powered customer support workspace that automates and streamlines the entire customer support workflow. 
                It intelligently processes customer inquiries, searches knowledge bases, generates contextual responses, manages support tickets, 
                and integrates with Gmail for seamless email communication—all while maintaining human oversight and a complete audit trail.
              </p>
            </section>

            {/* Employer Workflow */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Employer Workflow</h3>
              <ul className="space-y-3 text-[var(--foreground)]">
                <li className="flex items-start gap-3">
                  <span className="text-[var(--primary)] font-bold mt-1">•</span>
                  <span><strong>Support Inbox:</strong> View all customer conversations in a unified interface with real-time message history</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--primary)] font-bold mt-1">•</span>
                  <span><strong>Human Review Mode:</strong> Review AI-generated draft replies before sending, with full edit capability</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--primary)] font-bold mt-1">•</span>
                  <span><strong>Ticket Management:</strong> Create, view, and close support tickets directly from conversations</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--primary)] font-bold mt-1">•</span>
                  <span><strong>Gmail Draft Integration:</strong> Optionally create Gmail drafts for approved replies (OAuth 2.0 authenticated)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--primary)] font-bold mt-1">•</span>
                  <span><strong>Agent Activity Panel:</strong> View execution plans, audit logs, and AI decision-making process in real-time</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--primary)] font-bold mt-1">•</span>
                  <span><strong>Success Dashboard:</strong> Monitor customer health scores, engagement metrics, and support analytics</span>
                </li>
              </ul>
            </section>

            {/* Customer Workflow */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Customer Workflow</h3>
              <ul className="space-y-3 text-[var(--foreground)]">
                <li className="flex items-start gap-3">
                  <span className="text-[var(--success)] font-bold mt-1">•</span>
                  <span><strong>Ticket Status:</strong> View all support tickets with real-time status updates (Open, In Progress, Closed)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--success)] font-bold mt-1">•</span>
                  <span><strong>Customer Chat:</strong> Send messages to support team and receive AI-powered responses in real-time</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--success)] font-bold mt-1">•</span>
                  <span><strong>Message History:</strong> Access complete conversation history linked to specific tickets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--success)] font-bold mt-1">•</span>
                  <span><strong>Guest Mode:</strong> Access full functionality without authentication (demo mode)</span>
                </li>
              </ul>
            </section>

            {/* Tech Stack */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Tech Stack</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Frontend</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1">
                    <li>• Next.js 16 (App Router)</li>
                    <li>• React 19</li>
                    <li>• TypeScript</li>
                    <li>• Tailwind CSS 4</li>
                    <li>• Lucide React Icons</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Backend</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1">
                    <li>• FastAPI</li>
                    <li>• SQLAlchemy Async</li>
                    <li>• SQLite Database</li>
                    <li>• Python 3.11+</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">AI & APIs</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1">
                    <li>• OpenAI API (GPT-4)</li>
                    <li>• Gmail OAuth 2.0</li>
                    <li>• Google Gmail API</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Features</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1">
                    <li>• Intent Classification</li>
                    <li>• Knowledge Base Search</li>
                    <li>• Ticket Management</li>
                    <li>• Audit Logging</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* AI Pipeline */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">AI Pipeline Steps</h3>
              <div className="space-y-3">
                <div className="p-4 bg-[var(--background)] rounded-lg border-l-4 border-[var(--primary)]">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[var(--primary)]">1.</span>
                    <div>
                      <strong className="text-[var(--foreground)]">Intent Classification:</strong>
                      <p className="text-sm text-[var(--muted)] mt-1">Analyze customer message to determine intent (pricing, technical issue, billing, etc.) with confidence score</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border-l-4 border-[var(--primary)]">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[var(--primary)]">2.</span>
                    <div>
                      <strong className="text-[var(--foreground)]">Customer Profile & History:</strong>
                      <p className="text-sm text-[var(--muted)] mt-1">Retrieve customer information, past interactions, and conversation history</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border-l-4 border-[var(--primary)]">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[var(--primary)]">3.</span>
                    <div>
                      <strong className="text-[var(--foreground)]">Open Tickets Check:</strong>
                      <p className="text-sm text-[var(--muted)] mt-1">Query existing open tickets for the customer to provide context-aware responses</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border-l-4 border-[var(--primary)]">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[var(--primary)]">4.</span>
                    <div>
                      <strong className="text-[var(--foreground)]">Knowledge Base Search:</strong>
                      <p className="text-sm text-[var(--muted)] mt-1">Search internal knowledge base for relevant documentation and include sources in response</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border-l-4 border-[var(--primary)]">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[var(--primary)]">5.</span>
                    <div>
                      <strong className="text-[var(--foreground)]">Draft Response Generation:</strong>
                      <p className="text-sm text-[var(--muted)] mt-1">Generate contextual reply using OpenAI with all gathered context, formatted for human review</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border-l-4 border-[var(--primary)]">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[var(--primary)]">6.</span>
                    <div>
                      <strong className="text-[var(--foreground)]">Human Approval & Execution:</strong>
                      <p className="text-sm text-[var(--muted)] mt-1">Human reviews draft, approves/edits, then system sends message and executes any write actions (create ticket, etc.)</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Database Tables */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Database Schema</h3>
              <div className="space-y-4">
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Core Tables</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-2 font-mono">
                    <li><strong className="text-[var(--foreground)]">customers</strong> - id, name, email, company, created_at</li>
                    <li><strong className="text-[var(--foreground)]">messages</strong> - id, customer_id, direction, channel, body, created_at</li>
                    <li><strong className="text-[var(--foreground)]">tickets</strong> - id, customer_id, title, description, status, priority, category, created_at, updated_at, closed_at</li>
                    <li><strong className="text-[var(--foreground)]">agent_runs</strong> - id, customer_id, intent, confidence, plan_json, final_reply, created_at</li>
                    <li><strong className="text-[var(--foreground)]">audit_logs</strong> - id, run_id, tool_name, tool_input_json, tool_output_json, success, created_at</li>
                    <li><strong className="text-[var(--foreground)]">gmail_tokens</strong> - id, email, access_token, refresh_token, token_uri, client_id, client_secret, scopes, expiry</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Back to Home */}
            <div className="pt-6 border-t border-[var(--border)]">
              <Link href="/" className="btn btn-primary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

