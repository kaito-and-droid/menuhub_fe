"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, saveSession, Session } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    shop_name: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [field]: e.target.value });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api<Session>("/api/auth/register", {
        method: "POST",
        body: form,
      });
      saveSession(session);
      router.push("/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-stone-900">Create your shop</h1>
        <p className="mb-6 text-sm text-stone-500">
          Free to start — set up your menu in minutes
        </p>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        <label className="mb-1 block text-sm font-medium text-stone-700">Shop name</label>
        <input required value={form.shop_name} onChange={set("shop_name")} className={inputClass} />
        <label className="mb-1 block text-sm font-medium text-stone-700">Your name</label>
        <input required value={form.name} onChange={set("name")} className={inputClass} />
        <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
        <input type="email" required value={form.email} onChange={set("email")} className={inputClass} />
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Password <span className="font-normal text-stone-500">(min 8 characters)</span>
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={set("password")}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-md bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create shop"}
        </button>
        <p className="mt-4 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-amber-700 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
