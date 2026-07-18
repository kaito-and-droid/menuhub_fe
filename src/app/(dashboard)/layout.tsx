"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession, Session } from "@/lib/api";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/orders", label: "Orders" },
  { href: "/inventory", label: "Inventory" },
  { href: "/customers", label: "Customers" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setReady(true);
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false); // close the mobile drawer on navigation
  }, [pathname]);

  if (!ready || !session) return null;

  function signOut() {
    clearSession();
    router.push("/login");
  }

  const nav = (
    <nav className="flex-1 space-y-1 p-3">
      {NAV_LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
              active
                ? "bg-amber-50 text-amber-800"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${active ? "bg-amber-600" : "bg-stone-300"}`}
              aria-hidden="true"
            />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
            M
          </span>
          <div>
            <p className="font-bold leading-tight text-stone-900">MenuHub</p>
            <p className="truncate text-xs text-stone-500">{session.shop_slug}</p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
                  M
                </span>
                <p className="text-lg font-bold tracking-tight text-stone-900">MenuHub</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-stone-500"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            {nav}
            <div className="border-t border-stone-200 p-3">
              <p className="mb-2 truncate px-3 text-xs text-stone-500">{session.user_name}</p>
              <button
                onClick={signOut}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="border-b border-stone-200 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
              M
            </span>
            <p className="text-lg font-bold tracking-tight text-stone-900">MenuHub</p>
          </div>
          <p className="mt-1 truncate text-xs text-stone-500">{session.shop_slug}</p>
        </div>
        {nav}
        <div className="border-t border-stone-200 p-3">
          <p className="mb-2 truncate px-3 text-xs text-stone-500">{session.user_name}</p>
          <button
            onClick={signOut}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
