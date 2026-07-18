"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, downloadFile, getSession } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  CustomersAnalytics,
  IngredientsAnalytics,
  OrdersAnalytics,
  RevenueAnalytics,
} from "@/lib/types";
import { Badge, Button, Card, CardBody, CardHeader, ErrorBanner, LoadingText } from "@/components/ui";


// Validated categorical palette (dataviz reference, fixed slot order):
// slot 1 blue, slot 2 green, slot 3 magenta (magenta < 3:1 → always direct-labeled)
const SERIES = { revenue: "#2a78d6", profit: "#008300", third: "#e87ba4" };
const INK = { muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7" };

type Preset = "7d" | "30d" | "month";

function rangeFor(preset: Preset): { start: string; end: string } {
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const start = new Date(today);
  if (preset === "7d") start.setDate(today.getDate() - 6);
  if (preset === "30d") start.setDate(today.getDate() - 29);
  if (preset === "month") start.setDate(1);
  return { start: iso(start), end: iso(today) };
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  paynow: "PayNow",
  stripe: "Stripe",
};
const PAYMENT_ORDER = ["cash", "bank_transfer", "paynow", "stripe"];
// slot 4 (yellow) is below 3:1 on white — always paired with the direct label
const PAYMENT_COLORS = [SERIES.revenue, SERIES.profit, SERIES.third, "#eda100"];

export default function AnalyticsPage() {
  const shopId = getSession()?.shop_id;
  const currency = getSession()?.currency;
  const money = (v: number) => formatMoney(v, currency);
  const [preset, setPreset] = useState<Preset>("30d");
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomersAnalytics | null>(null);
  const [ingredients, setIngredients] = useState<IngredientsAnalytics | null>(null);
  const [orderStats, setOrderStats] = useState<OrdersAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { start, end } = rangeFor(preset);
    const range = `start_date=${start}&end_date=${end}`;
    try {
      const [rev, cust, ing, ord] = await Promise.all([
        api<RevenueAnalytics>(`/api/shops/${shopId}/analytics/revenue?${range}`),
        api<CustomersAnalytics>(`/api/shops/${shopId}/analytics/customers?${range}`),
        api<IngredientsAnalytics>(`/api/shops/${shopId}/analytics/ingredients?${range}`),
        api<OrdersAnalytics>(`/api/shops/${shopId}/analytics/orders?${range}`),
      ]);
      setRevenue(rev);
      setCustomers(cust);
      setIngredients(ing);
      setOrderStats(ord);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }, [shopId, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportRevenue() {
    const { start, end } = rangeFor(preset);
    void downloadFile(
      `/api/shops/${shopId}/analytics/revenue/export?start_date=${start}&end_date=${end}`,
      `revenue_${start}_${end}.csv`,
    );
  }

  function exportOrders() {
    void downloadFile(`/api/shops/${shopId}/orders/export`, "orders.csv");
  }

  if (!revenue || !customers || !ingredients || !orderStats) {
    return <LoadingText>{error ?? "Loading analytics…"}</LoadingText>;
  }

  const { summary } = revenue;
  const tiles = [
    { label: "Revenue", value: `${money(summary.total_revenue)}` },
    { label: "Gross profit", value: `${money(summary.gross_profit)}` },
    { label: "Margin", value: summary.profit_margin ?? "—" },
    { label: "Completed orders", value: String(summary.order_count) },
    { label: "Avg order", value: `${money(summary.avg_order_value)}` },
  ];

  const byDate = revenue.by_date.map((row) => ({
    ...row,
    label: row.date.slice(5), // MM-DD
  }));
  const payments = PAYMENT_ORDER.filter((m) => revenue.payment_breakdown[m]).map(
    (method, index) => ({
      method,
      label: PAYMENT_LABELS[method] ?? method,
      amount: revenue.payment_breakdown[method],
      color: PAYMENT_COLORS[PAYMENT_ORDER.indexOf(method)] ?? PAYMENT_COLORS[index],
    }),
  );
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const tooltipFormatter = (value: unknown) => money(Number(value ?? 0));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-stone-500">Sales, costs, and customer insights.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportRevenue}>
            Export revenue CSV
          </Button>
          <Button variant="secondary" onClick={exportOrders}>
            Export orders CSV
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-200 ${
              preset === p.value
                ? "bg-amber-600 text-white"
                : "bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-xs font-medium text-stone-500">{tile.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-stone-900">{tile.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader title="Revenue & profit by day" />
        <CardBody>
          {byDate.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              No completed orders in this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDate} barGap={2}>
                <CartesianGrid vertical={false} stroke={INK.grid} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: INK.axis }}
                  tick={{ fill: INK.muted, fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: INK.muted, fontSize: 12 }}
                  tickFormatter={(v: number) => money(v)}
                  width={80}
                />
                <Tooltip formatter={tooltipFormatter} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "#52514e", fontSize: 12 }}>{value}</span>
                  )}
                />
                <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="profit" name="Profit" fill={SERIES.profit} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Order activity" description={`${orderStats.total_orders} orders in this period · cancellation rate ${orderStats.cancellation_rate}`} />
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(orderStats.by_status).map(([status, count]) => (
              <Badge key={status} tone="neutral">
                {status}: {count}
              </Badge>
            ))}
            {Object.entries(orderStats.by_source).map(([source, count]) => (
              <Badge key={source} tone="amber">
                {source}: {count}
              </Badge>
            ))}
          </div>
          {orderStats.total_orders === 0 ? (
            <p className="py-4 text-center text-sm text-stone-500">No orders in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={orderStats.by_hour}>
                <CartesianGrid vertical={false} stroke={INK.grid} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={{ stroke: INK.axis }}
                  tick={{ fill: INK.muted, fontSize: 11 }}
                  interval={2}
                  tickFormatter={(h: number) => `${h}h`}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: INK.muted, fontSize: 11 }}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip
                  formatter={(value: unknown) => [String(value ?? 0), "Orders"]}
                  labelFormatter={(h) => `${h}:00–${h}:59`}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="orders" name="Orders" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by category" />
          <CardBody>
            {revenue.by_category.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, revenue.by_category.length * 44)}>
                <BarChart data={revenue.by_category} layout="vertical">
                  <CartesianGrid horizontal={false} stroke={INK.grid} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={{ stroke: INK.axis }}
                    tick={{ fill: INK.muted, fontSize: 12 }}
                    tickFormatter={(v: number) => money(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#52514e", fontSize: 12 }}
                    width={110}
                  />
                  <Tooltip formatter={tooltipFormatter} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <ul className="mt-2 space-y-1">
              {revenue.by_category.map((row) => (
                <li key={row.category} className="flex justify-between text-xs text-stone-500">
                  <span>{row.category}</span>
                  <span>margin {row.profit_margin ?? "—"}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payment methods" />
          <CardBody>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {payments.map((payment) => (
                  <li key={payment.method}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-stone-700">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: payment.color }}
                        />
                        {payment.label}
                      </span>
                      <span className="font-medium text-stone-900">
                        {money(payment.amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${paymentTotal ? (payment.amount / paymentTotal) * 100 : 0}%`,
                          background: payment.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="mb-2 mt-6 font-semibold text-stone-800">Ingredient spend</h2>
            {ingredients.cogs_summary.by_ingredient.length === 0 ? (
              <p className="text-sm text-stone-500">No purchases logged in this period.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {ingredients.cogs_summary.by_ingredient.map((row) => (
                  <li key={row.name} className="flex justify-between">
                    <span className="text-stone-600">{row.name}</span>
                    <span className="font-medium text-stone-900">
                      {money(row.total_spent)}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-stone-200 pt-1">
                  <span className="text-stone-500">Total</span>
                  <span className="font-semibold text-stone-900">
                    {money(ingredients.cogs_summary.total_spent)}
                  </span>
                </li>
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Top customers"
            description={`${customers.new_customers} new · repeat rate ${customers.repeat_rate}`}
          />
          <CardBody>
            {customers.top_spenders.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">No customers yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                      <th className="py-1 font-medium">Customer</th>
                      <th className="py-1 text-right font-medium">Orders</th>
                      <th className="py-1 text-right font-medium">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.top_spenders.map((spender) => (
                      <tr key={spender.customer_id} className="border-t border-stone-100">
                        <td className="py-1.5 text-stone-800">{spender.name}</td>
                        <td className="py-1.5 text-right">{spender.order_count}</td>
                        <td className="py-1.5 text-right font-medium">
                          {money(spender.lifetime_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Low stock" />
          <CardBody>
            {ingredients.low_stock_alerts.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">
                All ingredients above their reorder levels.
              </p>
            ) : (
              <ul className="space-y-2">
                {ingredients.low_stock_alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-red-800">{alert.name}</span>
                    <span className="text-red-700">
                      {alert.current} / reorder at {alert.reorder_level} {alert.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/inventory"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
            >
              Manage inventory →
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
