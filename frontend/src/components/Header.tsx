"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/employer", label: "Employer" },
    { href: "/customer/guest", label: "Customer" },
  ];

  return (
    <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[var(--primary)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-[var(--foreground)]">CX Agent</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <select
              value={pathname || "/"}
              onChange={(e) => {
                if (e.target.value) {
                  window.location.href = e.target.value;
                }
              }}
              className="text-sm bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--foreground)]"
            >
              {navLinks.map((link) => (
                <option key={link.href} value={link.href}>
                  {link.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

