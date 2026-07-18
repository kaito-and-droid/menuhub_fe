"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Customer, CustomerDetail, OrderStatus } from "@/lib/types";
import { Badge, Card, CloseIcon, EmptyState, ErrorBanner, Label, LoadingText, Modal } from "@/components/ui";

const STATUS_TONE: Record<OrderStatus, Parameters<typeof Badge>[0]["tone"]> = {
  pending: "yellow",
  preparing: "blue",
  ready: "green",
  completed: "neutral",
  cancelled: "red",
};

export default function CustomersPage() {
  const shopId = getSession()?.shop_id;
  const currency = getSession()?.currency;
  const money = (v: number) => formatMoney(v, currency);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCustomers(await api<Customer[]>(`/api/shops/${shopId}/customers`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    }
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(customer: Customer) {
    try {
      setDetail(await api<CustomerDetail>(`/api/shops/${shopId}/customers/${customer.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Customers</h1>
        <p className="mt-0.5 text-sm text-stone-500">Everyone who has ordered from your shop.</p>
      </div>
      {error && <ErrorBanner message={error} />}

      {customers === null ? (
        <LoadingText>Loading customers…</LoadingText>
      ) : customers.length === 0 ? (
        <EmptyState>Customers appear here automatically when they place their first order.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 text-right font-medium">Orders</th>
                <th className="px-5 py-3 text-right font-medium">Total spent</th>
                <th className="px-5 py-3 text-right font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => void openDetail(customer)}
                  className="cursor-pointer border-t border-stone-100 transition-colors duration-200 hover:bg-stone-50"
                >
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-stone-800">{customer.name}</p>
                    {customer.email && (
                      <p className="text-xs text-stone-500">{customer.email}</p>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-stone-600">{customer.phone}</td>
                  <td className="px-5 py-2.5 text-right">{customer.order_count}</td>
                  <td className="px-5 py-2.5 text-right font-medium">
                    {money(customer.total_spent)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-stone-500">
                    {customer.last_order_at
                      ? new Date(customer.last_order_at).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {detail && (
        <Modal onClose={() => setDetail(null)} labelledBy="customer-modal-title" maxWidth="max-w-lg">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 id="customer-modal-title" className="text-lg font-semibold text-stone-900">
                {detail.name}
              </h2>
              <p className="text-sm text-stone-500">
                {detail.phone}
                {detail.email && ` · ${detail.email}`}
              </p>
              {detail.address && <p className="text-xs text-stone-500">{detail.address}</p>}
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              aria-label="Close"
              className="cursor-pointer rounded-md p-1.5 text-stone-500 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-700"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Orders</p>
              <p className="font-semibold text-stone-900">{detail.order_count}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Lifetime</p>
              <p className="font-semibold text-stone-900">{money(detail.total_spent)}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Avg order</p>
              <p className="font-semibold text-stone-900">
                {detail.order_count ? money(Math.round(detail.total_spent / detail.order_count)) : "—"}
              </p>
            </div>
          </div>
          <h3 className="mb-2 text-sm font-semibold text-stone-800">Recent orders</h3>
          {detail.orders.length === 0 ? (
            <p className="text-sm text-stone-500">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {detail.orders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-stone-800">{order.order_number}</span>
                    <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                  </span>
                  <span className="text-right">
                    <span className="font-medium text-stone-900">
                      {money(order.total_amount)}
                    </span>
                    <span className="ml-2 text-xs text-stone-500">
                      {new Date(order.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
