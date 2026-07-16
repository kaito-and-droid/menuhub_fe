"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Customer, CustomerDetail } from "@/lib/types";


const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-stone-200 text-stone-600",
  cancelled: "bg-red-100 text-red-700",
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
      <h1 className="mb-4 text-2xl font-bold text-stone-900">Customers</h1>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {customers === null ? (
        <p className="text-sm text-stone-500">Loading customers…</p>
      ) : customers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          Customers appear here automatically when they place their first order.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 text-right font-medium">Orders</th>
                <th className="px-4 py-3 text-right font-medium">Total spent</th>
                <th className="px-4 py-3 text-right font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => void openDetail(customer)}
                  className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                >
                  <td className="px-4 py-2">
                    <p className="font-medium text-stone-800">{customer.name}</p>
                    {customer.email && (
                      <p className="text-xs text-stone-500">{customer.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-stone-600">{customer.phone}</td>
                  <td className="px-4 py-2 text-right">{customer.order_count}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {money(customer.total_spent)}
                  </td>
                  <td className="px-4 py-2 text-right text-stone-500">
                    {customer.last_order_at
                      ? new Date(customer.last_order_at).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{detail.name}</h2>
                <p className="text-sm text-stone-500">
                  {detail.phone}
                  {detail.email && ` · ${detail.email}`}
                </p>
                {detail.address && <p className="text-xs text-stone-500">{detail.address}</p>}
              </div>
              <button onClick={() => setDetail(null)} className="text-stone-500 hover:text-stone-600">
                ✕
              </button>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-stone-50 p-2">
                <p className="text-xs text-stone-500">Orders</p>
                <p className="font-semibold text-stone-900">{detail.order_count}</p>
              </div>
              <div className="rounded-md bg-stone-50 p-2">
                <p className="text-xs text-stone-500">Lifetime</p>
                <p className="font-semibold text-stone-900">{money(detail.total_spent)}</p>
              </div>
              <div className="rounded-md bg-stone-50 p-2">
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
                    className="flex items-center justify-between rounded-md border border-stone-100 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-stone-800">{order.order_number}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
                      >
                        {order.status}
                      </span>
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
          </div>
        </div>
      )}
    </div>
  );
}
