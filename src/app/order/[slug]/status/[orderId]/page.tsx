"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { publicApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useOrderI18n } from "@/lib/useOrderI18n";

const POLL_MS = 10_000;

interface StatusResponse {
  order_number: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  total_amount: number;
  created_at: string;
  estimated_ready_at: string | null;
  currency: string;
  payment_status: string;
  paynow_qr: string | null;
}

const STEPS = ["pending", "preparing", "ready", "completed"] as const;
const STEP_LABELS: Record<(typeof STEPS)[number], { en: string; vi: string }> = {
  pending: { en: "Received", vi: "Đã nhận" },
  preparing: { en: "Preparing", vi: "Đang chuẩn bị" },
  ready: { en: "Ready for you", vi: "Sẵn sàng" },
  completed: { en: "Done", vi: "Hoàn tất" },
};

export default function OrderStatusPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [order, setOrder] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale, t } = useOrderI18n();

  const load = useCallback(async () => {
    try {
      setOrder(
        await publicApi<StatusResponse>(`/api/public/shops/${slug}/status/${orderId}`),
      );
      setError(null);
    } catch {
      setError("Order not found");
    }
  }, [slug, orderId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf6f0] p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_8px_40px_rgba(120,80,40,0.12)]">
        {error ? (
          <p className="text-center text-stone-500">{t("order_not_found")}</p>
        ) : !order ? (
          <p className="text-center text-stone-500">{t("loading")}</p>
        ) : (
          <>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              {t("order")}
            </p>
            <h1 className="text-center text-3xl font-bold text-stone-900 [font-family:var(--font-display)]">
              {order.order_number}
            </h1>
            <p className="mt-1 text-center text-stone-600">
              {formatMoney(order.total_amount, order.currency)}
            </p>
            {order.estimated_ready_at &&
              (order.status === "pending" || order.status === "preparing") && (
                <p className="mt-1 text-center text-sm text-stone-500">
                  {t("ready_around", {
                    time: new Date(order.estimated_ready_at).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}
                </p>
              )}

            {order.paynow_qr && order.status !== "cancelled" && (
              <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 text-center">
                <p className="text-sm font-bold text-stone-900">{t("awaiting_paynow")}</p>
                <p className="mt-0.5 text-xs text-stone-500">{t("awaiting_paynow_help")}</p>
                <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3 shadow-sm">
                  <QRCodeSVG value={order.paynow_qr} size={160} marginSize={1} />
                </div>
              </div>
            )}
            {order.payment_status === "completed" && order.status !== "cancelled" && (
              <p className="mt-3 text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  {t("payment_received")}
                </span>
              </p>
            )}

            {order.status === "cancelled" ? (
              <p className="mt-6 rounded-md bg-red-50 p-3 text-center text-sm font-medium text-red-700">
                {t("order_cancelled")}
              </p>
            ) : (
              <ol className="mt-6 space-y-3">
                {STEPS.map((step, index) => {
                  const currentIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
                  const reached = index <= currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
                          reached ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {reached ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`text-sm ${
                          current
                            ? "font-semibold text-stone-900"
                            : reached
                              ? "text-stone-600"
                              : "text-stone-500"
                        }`}
                      >
                        {locale === "vi" ? STEP_LABELS[step].vi : STEP_LABELS[step].en}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-6 text-center text-xs text-stone-500">
              {t("updates_auto", {
                time: new Date(order.created_at).toLocaleString("vi-VN"),
              })}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
