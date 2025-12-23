"use client";

import Link from "next/link";

export default function CustomerPortal() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--success)] to-green-600 flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Customer Portal</h1>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl text-center">
          <div className="card p-8 sm:p-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--success)] to-green-600 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-4">
              Customer Portal
            </h2>
            <p className="text-[var(--muted)] mb-8">
              Choose how you'd like to continue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                disabled 
                className="btn btn-secondary inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                Login
              </button>
              <button 
                disabled 
                className="btn btn-secondary inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                Create account
              </button>
              <Link href="/customer/guest" className="btn btn-primary inline-flex items-center justify-center gap-2">
                Continue as Guest
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

