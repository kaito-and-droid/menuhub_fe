"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Campaign, DiscountType } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Label, LoadingText, Modal, inputClass } from "@/components/ui";

const STATUS_TONE: Record<Campaign["status"], Parameters<typeof Badge>[0]["tone"]> = {
  running: "green",
  scheduled: "blue",
  expired: "neutral",
  disabled: "neutral",
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-stone-500">Promotions shown on your order page, with auto-applied discounts.</p>
        </div>
        <Button onClick={() => setForm(emptyForm())}>+ New campaign</Button>
      </div>
      {error && <ErrorBanner message={error} />}

      {campaigns === null ? (
        <LoadingText>Loading campaigns…</LoadingText>
      ) : campaigns.length === 0 ? (
        <EmptyState>
          No campaigns yet. Promotions appear as banners on your order page, and discounts
          apply automatically at checkout.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-900">{campaign.title}</span>
                  <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
                  {campaign.discount_label && (
                    <Badge tone="amber">{campaign.discount_label}</Badge>
                  )}
                </div>
                <div className="flex gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => toggleActive(campaign)}
                    disabled={busy}
                    className="cursor-pointer text-amber-700 transition-colors duration-200 hover:text-amber-800 disabled:opacity-50"
                  >
                    {campaign.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(campaign)}
                    className="cursor-pointer text-amber-700 transition-colors duration-200 hover:text-amber-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(campaign)}
                    className="cursor-pointer text-stone-500 transition-colors duration-200 hover:text-red-600"
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
            </Card>
          ))}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} labelledBy="campaign-modal-title" maxWidth="max-w-md">
          <form onSubmit={submit}>
            <h2 id="campaign-modal-title" className="mb-4 text-lg font-semibold text-stone-900">
              {form.id ? "Edit campaign" : "New campaign"}
            </h2>
            <Field label="Title">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Grand opening -10%"
                className="mb-3"
              />
            </Field>
            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mb-3"
              />
            </Field>
            <Field label="Banner image URL (optional)">
              <input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="mb-3"
              />
            </Field>

            <Label>Discount</Label>
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
                  className={`flex-1 cursor-pointer rounded-lg border px-2 py-2 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-200 ${
                    form.discount_type === option.value
                      ? "border-amber-600 bg-amber-50 text-amber-900"
                      : "border-stone-300 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {form.discount_type !== "none" && (
              <div className="mb-3 flex gap-3">
                <div className="flex-1">
                  <Field label={form.discount_type === "percent" ? "Percent (1–100)" : "Amount (₫)"}>
                    <input
                      required
                      type="number"
                      min={0}
                      step="any"
                      max={form.discount_type === "percent" ? 100 : undefined}
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Min order (₫)">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            )}

            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <Field label="Starts">
                  <input
                    required
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Ends (optional)">
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-amber-600"
              />
              Active
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save campaign"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
