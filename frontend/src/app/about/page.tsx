"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center">
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
                CX Agent is an AI-powered customer support platform that automates and streamlines the entire customer support workflow. 
                It intelligently processes customer inquiries, searches knowledge bases, generates contextual responses, manages support tickets, 
                and integrates with Gmail for seamless email communication—all while maintaining human oversight and a complete audit trail.
              </p>
            </section>

            {/* Architecture */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Architecture</h3>
              <div className="space-y-4">
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Frontend</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>Next.js 16 with App Router for server-side rendering and routing</li>
                    <li>React 19 with TypeScript for type-safe component development</li>
                    <li>Tailwind CSS 4 for utility-first styling with dark mode support</li>
                    <li>Client-side state management with React hooks</li>
                    <li>Responsive design optimized for desktop and mobile devices</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Backend</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>FastAPI framework for high-performance async Python API</li>
                    <li>SQLAlchemy Async ORM for database operations</li>
                    <li>RESTful API design with proper error handling</li>
                    <li>CORS middleware for cross-origin requests</li>
                    <li>Automatic database migrations on startup</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Database</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>SQLite database for local development and demo</li>
                    <li>Schema includes: customers, messages, tickets, agent_runs, audit_logs, gmail_tokens</li>
                    <li>Automatic schema migrations for safe database updates</li>
                    <li>Relationships and foreign keys properly defined</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">AI & OpenAI</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>OpenAI GPT-4o-mini integration for intelligent reply generation</li>
                    <li>Intent classification with confidence scoring</li>
                    <li>Multi-step execution planning based on customer context</li>
                    <li>Fallback to mock replies when API key is not configured</li>
                    <li>Context-aware responses using customer history and knowledge base</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Knowledge Base Search</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>Keyword-based search through markdown documentation</li>
                    <li>Relevance scoring for search results</li>
                    <li>Automatic citation of sources in AI-generated replies</li>
                    <li>Support for multiple KB articles with headings and snippets</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Human Approval</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>Optional human-in-the-loop review before sending AI replies</li>
                    <li>Draft editing capability for fine-tuning responses</li>
                    <li>Approval workflow with pending write actions visibility</li>
                    <li>Audit trail of all agent decisions and tool executions</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Gmail Draft Integration</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>Google OAuth 2.0 authentication for Gmail API access</li>
                    <li>Create Gmail drafts from approved replies (no auto-send)</li>
                    <li>Secure token storage with refresh token support</li>
                    <li>Optional email subject generation based on intent</li>
                  </ul>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)] mb-2">Deployment</h4>
                  <ul className="text-sm text-[var(--muted)] space-y-1 ml-4 list-disc">
                    <li>Frontend deployed on Vercel with automatic builds from Git</li>
                    <li>Backend deployed on Render with Python runtime</li>
                    <li>Environment variables configured for production</li>
                    <li>CORS configured for cross-origin API access</li>
                    <li>Database migrations run automatically on backend startup</li>
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

