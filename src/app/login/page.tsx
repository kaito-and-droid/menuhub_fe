"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, saveSession, Session } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api<Session>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveSession(session);
      router.push("/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-stone-900">MenuHub</h1>
        <p className="mb-6 text-sm text-stone-500">Sign in to your shop dashboard</p>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-stone-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-amber-700 hover:underline">
            Create your shop
          </Link>
        </p>
      </form>
    </main>
  );
}
