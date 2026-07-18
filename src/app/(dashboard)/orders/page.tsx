"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Order, OrderStatus } from "@/lib/types";

// SSE is the primary update channel; the slow poll only covers dropped streams.
const FALLBACK_POLL_MS = 60_000;

const TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const NEXT_ACTIONS: Record<OrderStatus, { label: string; to: OrderStatus }[]> = {
  pending: [
    { label: "Start preparing", to: "preparing" },
    { label: "Cancel", to: "cancelled" },
  ],
  preparing: [
    { label: "Mark ready", to: "ready" },
    { label: "Cancel", to: "cancelled" },
  ],
  ready: [
    { label: "Complete", to: "completed" },
    { label: "Cancel", to: "cancelled" },
  ],
  completed: [],
  cancelled: [],
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-stone-200 text-stone-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const shopId = getSession()?.shop_id;
  const currency = getSession()?.currency;
  const money = (v: number) => formatMoney(v, currency);
  const [tab, setTab] = useState<OrderStatus | "">("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const mutating = useRef(false);

  const load = useCallback(async () => {
    if (mutating.current) return;
    try {
      const query = tab ? `?status=${tab}` : "";
      setOrders(await api<Order[]>(`/api/shops/${shopId}/orders${query}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    }
  }, [shopId, tab]);

  useEffect(() => {
    setOrders(null);
    void load();
    const timer = setInterval(() => void load(), FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Real-time channel: any order event triggers a refetch. EventSource
  // reconnects on its own; the fallback poll above covers silent drops.
  useEffect(() => {
    const token = getSession()?.access_token;
    if (!shopId || !token) return;
    const source = new EventSource(
      `${API_URL}/api/shops/${shopId}/orders/stream?token=${encodeURIComponent(token)}`,
    );
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = () => void load();
    return () => source.close();
  }, [shopId, load]);

  async function advance(order: Order, to: OrderStatus) {
    if (to === "cancelled" && !confirm(`Cancel order ${order.order_number}?`)) return;
    mutating.current = true;
    try {
      await api(`/api/shops/${shopId}/orders/${order.id}`, {
        method: "PATCH",
        body: { status: to },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      mutating.current = false;
      void load();
    }
  }

  async function markPaid(order: Order) {
    mutating.current = true;
    try {
      await api(`/api/shops/${shopId}/orders/${order.id}/payment`, {
        method: "PATCH",
        body: { payment_status: "completed" },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      mutating.current = false;
      void load();
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-stone-900">
        Orders
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            live ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-500"
          }`}
          title={live ? "Real-time updates connected" : "Reconnecting — updates may lag"}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              live ? "bg-green-600" : "bg-stone-400"
            }`}
          />
          {live ? "Live" : "Offline"}
        </span>
      </h1>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              tab === t.value
                ? "bg-amber-600 text-white"
                : "bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {orders === null ? (
        <p className="text-sm text-stone-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          No orders here yet. New orders appear automatically.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-stone-900">{order.order_number}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-xs text-stone-500">
                    {new Date(order.created_at).toLocaleString("vi-VN")} · {order.source}
                    {" · "}
                    {order.delivery_type}
                    {order.postal_code && ` · ${order.postal_code}`}
                  </span>
                  {order.payment_status === "pending" &&
                    order.payment_method !== "cash" &&
                    order.status !== "cancelled" && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                        Unpaid · {order.payment_method === "paynow" ? "PayNow" : "transfer"}
                      </span>
                    )}
                </div>
                <div className="flex gap-2">
                  {order.payment_status === "pending" &&
                    order.payment_method !== "cash" &&
                    order.status !== "cancelled" && (
                      <button
                        onClick={() => void markPaid(order)}
                        className="cursor-pointer rounded-md border border-green-600 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors duration-200 hover:bg-green-50"
                      >
                        Mark paid
                      </button>
                    )}
                  {NEXT_ACTIONS[order.status].map((action) => (
                    <button
                      key={action.to}
                      onClick={() => advance(order, action.to)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                        action.to === "cancelled"
                          ? "text-stone-500 hover:bg-red-50 hover:text-red-700"
                          : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <div className="text-sm text-stone-600">
                  {order.customer && (
                    <p className="font-medium text-stone-800">
                      {order.customer.name} · {order.customer.phone}
                    </p>
                  )}
                  <ul className="mt-1">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        {item.quantity}× {item.name}
                        {item.variant_name && (
                          <span className="text-xs text-amber-700"> ({item.variant_name})</span>
                        )}
                        {item.notes && (
                          <span className="text-xs text-stone-500"> — {item.notes}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {order.notes && (
                    <p className="mt-1 text-xs text-stone-500">Note: {order.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  {order.discount_amount > 0 && (
                    <p className="text-xs font-medium text-green-700">
                      −{money(order.discount_amount)} · {order.campaign_title ?? "promo"}
                    </p>
                  )}
                  <p className="text-lg font-semibold text-stone-900">
                    {money(order.total_amount)}
                    <span className="ml-2 text-xs font-normal text-stone-500">
                      {order.payment_method}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
