"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Campaign, DiscountType } from "@/lib/types";


const STATUS_STYLE: Record<Campaign["status"], string> = {
  running: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  expired: "bg-stone-200 text-stone-500",
  disabled: "bg-stone-200 text-stone-500",
};

interface CampaignForm {
  id: string | null;
  title: string;
  description: string;
  image_url: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order_amount: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): CampaignForm {
  return {
    id: null,
    title: "",
    description: "",
    image_url: "",
    discount_type: "percent",
    discount_value: "10",
    min_order_amount: "",
    starts_at: toLocalInput(new Date().toISOString()),
    ends_at: "",
    is_active: true,
  };
}

export default function CampaignsPage() {
  const shopId = getSession()?.shop_id;
  const currency = getSession()?.currency;
  const money = (v: number) => formatMoney(v, currency);
  const base = `/api/shops/${shopId}/campaigns`;

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [form, setForm] = useState<CampaignForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCampaigns(await api<Campaign[]>(base));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      discount_type: form.discount_type,
      discount_value:
        form.discount_type === "none" ? null : Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount || 0),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    };
    void run(async () => {
      if (form.id) {
        await api(`${base}/${form.id}`, { method: "PATCH", body });
      } else {
        await api(base, { method: "POST", body });
      }
      setForm(null);
    });
  }

  function toggleActive(campaign: Campaign) {
    void run(() =>
      api(`${base}/${campaign.id}`, {
        method: "PATCH",
        body: { is_active: !campaign.is_active },
      }),
    );
  }

  function remove(campaign: Campaign) {
    if (!confirm(`Delete campaign "${campaign.title}"?`)) return;
    void run(() => api(`${base}/${campaign.id}`, { method: "DELETE" }));
  }

  function openEdit(campaign: Campaign) {
    setForm({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description ?? "",
      image_url: campaign.image_url ?? "",
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value !== null ? String(campaign.discount_value) : "",
      min_order_amount: campaign.min_order_amount ? String(campaign.min_order_amount) : "",
      starts_at: toLocalInput(campaign.starts_at),
      ends_at: toLocalInput(campaign.ends_at),
      is_active: campaign.is_active,
    });
  }

  const inputClass =
    "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-stone-700";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Campaigns</h1>
        <button
          onClick={() => setForm(emptyForm())}
          className="cursor-pointer rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          + New campaign
        </button>
      </div>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {campaigns === null ? (
        <p className="text-sm text-stone-500">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          No campaigns yet. Promotions appear as banners on your order page, and discounts
          apply automatically at checkout.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900">{campaign.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[campaign.status]}`}
                  >
                    {campaign.status}
                  </span>
                  {campaign.discount_label && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {campaign.discount_label}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-xs font-medium">
                  <button
                    onClick={() => toggleActive(campaign)}
                    disabled={busy}
                    className="cursor-pointer text-amber-700 hover:underline"
                  >
                    {campaign.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEdit(campaign)}
                    className="cursor-pointer text-amber-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(campaign)}
                    className="cursor-pointer text-stone-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {campaign.description && (
                <p className="mt-1 text-sm text-stone-500">{campaign.description}</p>
              )}
              <p className="mt-1 text-xs text-stone-500">
                {new Date(campaign.starts_at).toLocaleString("vi-VN")} →{" "}
                {campaign.ends_at
                  ? new Date(campaign.ends_at).toLocaleString("vi-VN")
                  : "no end date"}
                {campaign.min_order_amount > 0 &&
                  ` · min order ${money(campaign.min_order_amount)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
          >
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              {form.id ? "Edit campaign" : "New campaign"}
            </h2>
            <label className={labelClass}>Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Grand opening -10%"
              className={`${inputClass} mb-3`}
            />
            <label className={labelClass}>Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputClass} mb-3`}
            />
            <label className={labelClass}>Banner image URL (optional)</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className={`${inputClass} mb-3`}
            />

            <label className={labelClass}>Discount</label>
            <div className="mb-3 flex gap-2">
              {(
                [
                  { value: "none", label: "None (banner only)" },
                  { value: "percent", label: "% off" },
                  { value: "fixed", label: "₫ off" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, discount_type: option.value })}
                  className={`flex-1 cursor-pointer rounded-md border px-2 py-2 text-xs font-medium ${
                    form.discount_type === option.value
                      ? "border-amber-600 bg-amber-50 text-amber-900"
                      : "border-stone-300 text-stone-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {form.discount_type !== "none" && (
              <div className="mb-3 flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>
                    {form.discount_type === "percent" ? "Percent (1–100)" : "Amount (₫)"}
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    step="any"
                    max={form.discount_type === "percent" ? 100 : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Min order (₫)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label className={labelClass}>Starts</label>
                <input
                  required
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>
                  Ends <span className="font-normal text-stone-500">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="mb-4 flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 accent-amber-600"
              />
              Active
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="cursor-pointer rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="cursor-pointer rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save campaign"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
