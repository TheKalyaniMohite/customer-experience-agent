"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">CX Agent</h1>
          </div>
          <Link
            href="/about"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors font-medium"
          >
            About
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] mb-4">
              Customer Experience Agent
            </h2>
            <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
              AI-powered support workspace for managing customer interactions, tickets, and insights
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Employer Dashboard */}
            <Link href="/employer" className="card p-8 sm:p-12 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer group">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3">
                  Employer Dashboard
                </h3>
                <p className="text-[var(--muted)] text-base">
                  AI-powered support workspace for managing customer interactions and tickets
                </p>
              </div>
            </Link>

            {/* Customer Dashboard */}
            <Link href="/customer/guest" className="card p-8 sm:p-12 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer group">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[var(--success)] to-green-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3">
                  Customer Dashboard
                </h3>
                <p className="text-[var(--muted)] text-base">
                  View your support tickets and chat with our AI assistant
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
