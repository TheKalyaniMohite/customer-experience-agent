"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getCustomers, seedDemoData, type Customer } from "@/lib/api";

export default function CustomerGuestPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load customers";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedDemo() {
    try {
      setSeeding(true);
      setError(null);
      await seedDemoData();
      await loadCustomers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to seed demo data";
      setError(errorMsg);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
                Customer Guest Portal
              </h1>
              <p className="text-[var(--muted)]">
                Select a customer to view tickets and chat with support
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-lg">
                <p className="text-sm text-[var(--danger)]">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="loading-state py-12">
                <div className="loading-spinner"></div>
                <p className="text-sm text-[var(--muted)] mt-4">Loading customers...</p>
              </div>
            ) : customers.length === 0 ? (
              /* Empty State */
              <div className="empty-state py-12">
                <div className="empty-state-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="empty-state-title">No Customers Found</h3>
                <p className="empty-state-description mb-6">
                  Create demo customers to get started
                </p>
                <button
                  onClick={handleSeedDemo}
                  disabled={seeding}
                  className="btn btn-primary"
                >
                  {seeding ? "Creating..." : "Create Demo Customers"}
                </button>
              </div>
            ) : (
              /* Customer List */
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">
                  Select Customer ({customers.length})
                </h2>
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-md bg-[var(--primary)] text-white flex items-center justify-center text-sm font-medium">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">
                              {customer.name}
                            </h3>
                            <p className="text-xs text-[var(--muted)]">{customer.email}</p>
                            {customer.company && (
                              <p className="text-xs text-[var(--muted)]">{customer.company}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/customer?customerId=${customer.id}`)}
                        className="btn btn-primary flex-1"
                      >
                        Open Chat
                      </button>
                      <button
                        onClick={() => router.push(`/customer?customerId=${customer.id}&tab=tickets`)}
                        className="btn btn-secondary flex-1"
                      >
                        View Tickets
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
