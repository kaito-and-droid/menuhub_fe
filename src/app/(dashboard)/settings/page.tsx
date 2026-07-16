"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_URL, api, getSession } from "@/lib/api";

interface ShopSettings {
  shop_name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  payment_methods: Record<string, boolean>;
  prep_minutes: number;
  paynow_proxy_type: string | null;
  paynow_proxy_value: string | null;
  facebook_page_id: string | null;
  facebook_connected: boolean;
}

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";

export default function SettingsPage() {
  const shopId = getSession()?.shop_id;
  const base = `/api/shops/${shopId}/settings`;

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    shop_name: "",
    email: "",
    phone: "",
    address: "",
    prep_minutes: "15",
  });
  const [fb, setFb] = useState({ page_id: "", token: "" });
  const [paynow, setPaynow] = useState({ proxy_type: "UEN", proxy_value: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<ShopSettings>(base);
      setSettings(data);
      setForm({
        shop_name: data.shop_name,
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        prep_minutes: String(data.prep_minutes),
      });
      setFb({ page_id: data.facebook_page_id ?? "", token: "" });
      setPaynow({
        proxy_type: data.paynow_proxy_type ?? "UEN",
        proxy_value: data.paynow_proxy_value ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const data = await api<ShopSettings>(base, { method: "PATCH", body });
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function saveInfo(e: FormEvent) {
    e.preventDefault();
    void save({
      shop_name: form.shop_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      prep_minutes: Math.max(1, Number(form.prep_minutes) || 15),
    });
  }

  function togglePayment(method: string) {
    if (!settings) return;
    void save({
      payment_methods: { ...settings.payment_methods, [method]: !settings.payment_methods[method] },
    });
  }

  function saveFacebook(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { facebook_page_id: fb.page_id.trim() || null };
    if (fb.token.trim()) body.facebook_page_access_token = fb.token.trim();
    void save(body);
    setFb((f) => ({ ...f, token: "" }));
  }

  function copy(text: string, tag: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!settings) {
    return <p className="text-sm text-stone-500">{error ?? "Loading settings…"}</p>;
  }

  const orderUrl = `${window.location.origin}/order/${settings.slug}`;
  const embedSnippet = `<iframe src="${orderUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  const webhookUrl = `${API_URL}/webhooks/facebook`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        {saved && <span className="text-sm font-medium text-green-700">Saved ✓</span>}
      </div>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={saveInfo} className="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-stone-800">Shop info</h2>
        <label className="mb-1 block text-sm font-medium text-stone-700">Shop name</label>
        <input
          required
          value={form.shop_name}
          onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
          className={`${inputClass} mb-3`}
        />
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Address</label>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={`${inputClass} mb-3`}
        />
        <div className="mb-4 flex gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Preparation time (min)
            </label>
            <input
              type="number"
              min={1}
              max={240}
              value={form.prep_minutes}
              onChange={(e) => setForm({ ...form, prep_minutes: e.target.value })}
              className={`${inputClass} w-32`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => void save({ currency: e.target.value })}
              className={`${inputClass} w-32`}
            >
              <option value="VND">₫ VND</option>
              <option value="SGD">S$ SGD</option>
            </select>
            <p className="mt-1 max-w-[220px] text-xs text-stone-500">
              Existing prices are not converted when you switch.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Save shop info
        </button>
      </form>

      <section className="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-stone-800">Payment methods</h2>
        <div className="space-y-2">
          {[
            { key: "cash", label: "Cash on pickup/delivery" },
            { key: "bank_transfer", label: "Bank transfer" },
          ].map((method) => (
            <label key={method.key} className="flex items-center justify-between text-sm">
              <span className="text-stone-700">{method.label}</span>
              <input
                type="checkbox"
                checked={settings.payment_methods[method.key] ?? false}
                onChange={() => togglePayment(method.key)}
                disabled={busy}
                className="h-4 w-4 accent-amber-600"
              />
            </label>
          ))}
          <label
            className={`flex items-center justify-between text-sm ${
              settings.currency === "SGD" ? "" : "opacity-50"
            }`}
          >
            <span className="text-stone-700">
              PayNow{" "}
              <span className="text-xs text-stone-500">
                (SGD shops with a PayNow proxy configured below)
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.payment_methods.paynow ?? false}
              onChange={() => togglePayment("paynow")}
              disabled={
                busy ||
                settings.currency !== "SGD" ||
                !settings.paynow_proxy_value
              }
              className="h-4 w-4 accent-amber-600"
            />
          </label>
          <label className="flex items-center justify-between text-sm opacity-50">
            <span className="text-stone-700">
              Stripe <span className="text-xs text-stone-500">(coming in Phase 2)</span>
            </span>
            <input type="checkbox" checked={false} disabled className="h-4 w-4" />
          </label>
        </div>

        <div className="mt-4 rounded-md bg-stone-50 p-3">
          <p className="mb-2 text-sm font-medium text-stone-700">PayNow details (Singapore)</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Proxy type</label>
              <select
                value={paynow.proxy_type}
                onChange={(e) => setPaynow({ ...paynow, proxy_type: e.target.value })}
                className={`${inputClass} w-28`}
              >
                <option value="UEN">UEN</option>
                <option value="MOBILE">Mobile</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">
                {paynow.proxy_type === "UEN" ? "UEN" : "SG mobile number"}
              </label>
              <input
                value={paynow.proxy_value}
                onChange={(e) => setPaynow({ ...paynow, proxy_value: e.target.value })}
                placeholder={paynow.proxy_type === "UEN" ? "e.g. 201403121W" : "e.g. 91234567"}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void save({
                  paynow_proxy_type: paynow.proxy_type,
                  paynow_proxy_value: paynow.proxy_value.trim() || null,
                })
              }
              className="cursor-pointer rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Save PayNow
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Customers scan a QR embedding the exact amount + order number; you confirm each
            payment with &quot;Mark paid&quot; on the Orders page.
          </p>
        </div>
      </section>

      <form onSubmit={saveFacebook} className="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-stone-800">
          Facebook Messenger
          {settings.facebook_connected && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Connected ✓
            </span>
          )}
        </h2>
        <p className="mb-3 text-xs text-stone-500">
          Customers get order updates in Messenger and can check status by sending their
          order number to your Page.
        </p>
        <label className="mb-1 block text-sm font-medium text-stone-700">Facebook Page ID</label>
        <input
          value={fb.page_id}
          onChange={(e) => setFb({ ...fb, page_id: e.target.value })}
          className={`${inputClass} mb-3`}
        />
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Page access token{" "}
          <span className="font-normal text-stone-500">
            (write-only — leave blank to keep the current one)
          </span>
        </label>
        <input
          type="password"
          value={fb.token}
          onChange={(e) => setFb({ ...fb, token: e.target.value })}
          className={`${inputClass} mb-4`}
        />
        <button
          type="submit"
          disabled={busy}
          className="mb-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Save Facebook settings
        </button>

        <div className="rounded-md bg-stone-50 p-3 text-xs text-stone-600">
          <p className="mb-1 font-medium text-stone-700">Webhook setup (in your FB App):</p>
          <p className="mb-1 flex items-center gap-2">
            Callback URL: <code className="rounded bg-white px-1">{webhookUrl}</code>
            <button type="button" onClick={() => copy(webhookUrl, "wh")} className="text-amber-700 hover:underline">
              {copied === "wh" ? "Copied!" : "Copy"}
            </button>
          </p>
          <p>
            Verify token: <code className="rounded bg-white px-1">menuhub-verify</code>{" "}
            <span className="text-stone-500">(or your FACEBOOK_VERIFY_TOKEN)</span>
          </p>
        </div>
      </form>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-stone-800">Order page & embed</h2>
        <p className="mb-3 text-xs text-stone-500">
          Share your order link anywhere, or embed the form on your website / Facebook Page tab.
        </p>
        <p className="mb-2 flex items-center gap-2 text-sm">
          <a href={orderUrl} target="_blank" className="font-medium text-amber-700 hover:underline">
            {orderUrl}
          </a>
          <button type="button" onClick={() => copy(orderUrl, "url")} className="text-xs text-amber-700 hover:underline">
            {copied === "url" ? "Copied!" : "Copy"}
          </button>
        </p>
        <div className="flex items-start gap-2">
          <code className="block flex-1 overflow-x-auto rounded-md bg-stone-50 p-3 text-xs text-stone-600">
            {embedSnippet}
          </code>
          <button
            type="button"
            onClick={() => copy(embedSnippet, "embed")}
            className="shrink-0 text-xs font-medium text-amber-700 hover:underline"
          >
            {copied === "embed" ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>
    </div>
  );
}
