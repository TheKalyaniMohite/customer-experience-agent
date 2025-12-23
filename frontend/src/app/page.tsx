"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
              Customer Experience Agent
            </h1>
            <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto">
              AI-powered support workspace for managing customer interactions, tickets, and insights
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employer Dashboard */}
            <Link 
              href="/employer" 
              className="group block bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 sm:p-10 hover:border-[var(--primary)] hover:shadow-lg transition-all duration-200"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 mb-6 rounded-xl bg-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  Employer Dashboard
                </h2>
                <p className="text-[var(--muted)]">
                  Manage customer support with AI assistance
                </p>
              </div>
            </Link>

            {/* Customer Dashboard */}
            <Link 
              href="/customer/guest" 
              className="group block bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 sm:p-10 hover:border-[var(--primary)] hover:shadow-lg transition-all duration-200"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 mb-6 rounded-xl bg-[var(--success)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  Customer Dashboard
                </h2>
                <p className="text-[var(--muted)]">
                  View tickets and chat with support
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
