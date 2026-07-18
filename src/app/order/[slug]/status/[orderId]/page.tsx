"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { publicApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useOrderI18n } from "@/lib/useOrderI18n";
import { formatOrderDateTime, formatOrderTime } from "@/lib/order-i18n";

const POLL_MS = 10_000;

/** Statuses where no further updates are expected — stop polling. */
const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

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
  const statusRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await publicApi<StatusResponse>(
        `/api/public/shops/${slug}/status/${orderId}`,
      );
      statusRef.current = data.status;
      setOrder(data);
      setError(null);
    } catch {
      setError("Order not found");
    }
  }, [slug, orderId]);

  useEffect(() => {
    void load();

    let timer: ReturnType<typeof setInterval> | null = null;

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function start() {
      if (timer || TERMINAL_STATUSES.has(statusRef.current ?? "")) return;
      timer = setInterval(() => {
        // Stop once the order reaches a terminal state.
        if (TERMINAL_STATUSES.has(statusRef.current ?? "")) {
          stop();
          return;
        }
        void load();
      }, POLL_MS);
    }

    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        // Refresh immediately on return, then resume polling.
        void load();
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const stepLabel = (step: (typeof STEPS)[number]) =>
    locale === "vi" ? STEP_LABELS[step].vi : STEP_LABELS[step].en;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf6f0] p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_8px_40px_rgba(120,80,40,0.12)]">
        {error ? (
          <p className="text-center text-stone-500">{t("order_not_found")}</p>
        ) : !order ? (
          <p className="text-center text-stone-500">{t("loading")}</p>
        ) : (
          <>
            {/* Screen-reader live announcement of the current order status. */}
            <p aria-live="polite" className="sr-only">
              {order.status === "cancelled"
                ? t("order_cancelled")
                : t("status_now", { status: stepLabel(order.status as (typeof STEPS)[number]) })}
            </p>
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
                    time: formatOrderTime(order.estimated_ready_at, locale),
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
              <div className="mt-6">
                <p className="rounded-md bg-red-50 p-3 text-center text-sm font-medium text-red-700">
                  {t("order_cancelled")}
                </p>
                <Link
                  href={`/order/${slug}`}
                  className="mt-4 block w-full cursor-pointer rounded-xl bg-amber-700 py-3 text-center text-sm font-bold text-white transition-colors duration-200 hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  {t("back_to_menu")}
                </Link>
              </div>
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
                        aria-current={current ? "step" : undefined}
                        className={`text-sm ${
                          current
                            ? "font-semibold text-stone-900"
                            : reached
                              ? "text-stone-600"
                              : "text-stone-500"
                        }`}
                      >
                        {stepLabel(step)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-6 text-center text-xs text-stone-500">
              {t("updates_auto", {
                time: formatOrderDateTime(order.created_at, locale),
              })}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
