"use client";

import Header from "@/components/Header";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
              Project Overview
            </h1>
            <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
              A full-stack AI-powered customer support platform demonstrating modern web development practices
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Frontend */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Frontend</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Next.js 16 with App Router</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>React 19 + TypeScript</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Tailwind CSS 4</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Responsive design</span>
                </li>
              </ul>
            </div>

            {/* Backend */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Backend</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>FastAPI async Python</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>SQLAlchemy Async ORM</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>RESTful API design</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Auto database migrations</span>
                </li>
              </ul>
            </div>

            {/* Database */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Database</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>SQLite with async support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Schema: customers, messages, tickets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Agent runs + audit logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Gmail token storage</span>
                </li>
              </ul>
            </div>

            {/* AI & OpenAI */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">AI & OpenAI</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>GPT-4o-mini integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Intent classification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Multi-step execution planning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Context-aware responses</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Key Features */}
          <div className="space-y-6 mb-12">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Key Features</h2>
            
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Knowledge Base Search</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Keyword-based search through markdown documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Relevance scoring and automatic source citations</span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Human Approval Workflow</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Optional human-in-the-loop review before sending AI replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Draft editing and approval workflow with audit trail</span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Gmail Draft Integration</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Google OAuth 2.0 authentication for Gmail API</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Create Gmail drafts from approved replies (no auto-send)</span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Deployment</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Frontend: Vercel with automatic builds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>Backend: Render with Python runtime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--primary)] mt-1">•</span>
                  <span>CORS configured for production</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
