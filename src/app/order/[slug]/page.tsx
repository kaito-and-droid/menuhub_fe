"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { publicApi } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { PublicCampaign, PublicMenu, PublicMenuItem } from "@/lib/types";
import GallerySection from "@/components/GallerySection";
import { MOCK_MENU, makeMockOrder } from "@/lib/mock-menu";


/** Composite cart key: itemId or "itemId::variantName" */
function cartKey(id: string, variant?: string | null): string {
  return variant ? `${id}::${variant}` : id;
}

function parseCartKey(key: string): { itemId: string; variantName: string | null } {
  const sep = key.indexOf("::");
  if (sep === -1) return { itemId: key, variantName: null };
  return { itemId: key.slice(0, sep), variantName: key.slice(sep + 2) || null };
}

interface CreatedOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  campaign_title: string | null;
  estimated_ready_at: string | null;
  currency: string;
  paynow_qr: string | null;
}

/** Mirrors the server rule: best single discount among running campaigns. */
function computeDiscount(
  subtotal: number,
  campaigns: PublicCampaign[],
): { amount: number; campaign: PublicCampaign | null } {
  let best = 0;
  let bestCampaign: PublicCampaign | null = null;
  for (const c of campaigns) {
    if (c.discount_type === "none" || c.discount_value === null) continue;
    if (subtotal < c.min_order_amount) continue;
    const amount =
      c.discount_type === "percent"
        ? Math.round(subtotal * c.discount_value) / 100 // 2dp like the server
        : Math.min(c.discount_value, subtotal);
    if (amount > best) {
      best = amount;
      bestCampaign = c;
    }
  }
  return { amount: best, campaign: bestCampaign };
}

const IconTag = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  delivery_type: string;
  delivery_address: string;
  postal_code: string;
  payment_method: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  delivery_type: "pickup",
  delivery_address: "",
  postal_code: "",
  payment_method: "cash",
  notes: "",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  paynow: "PayNow",
};

/* ---------- inline SVG icons (Lucide-style, 24x24) ---------- */
const icon = "h-5 w-5";
const IconClock = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconPlus = () => (
  <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconMinus = () => (
  <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
    <path d="M5 12h14" />
  </svg>
);
const IconBag = () => (
  <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const IconCheck = () => (
  <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconChevronLeft = () => (
  <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const IconMessenger = () => (
  <svg className={icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.15.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.53-.04.91.25 1.88.38 2.91.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66c-.47.74-1.47.93-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66c.47-.74 1.47-.93 2.17-.4l2.34 1.75c.21.16.51.16.72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
  </svg>
);
const IconUser = () => (
  <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconSparkle = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v3m0 12v3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2M3 12h3m12 0h3M5.6 18.4l2.2-2.2m8.4-8.4 2.2-2.2" />
  </svg>
);
const IconMegaphone = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m3 11 18-5v12L3 13v-2Z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

/* ---------- membership persistence (device-level, per shop) ---------- */
interface MemberRecord {
  name: string;
  phone: string;
  email: string;
  delivery_address: string;
}

function memberKey(slug: string) {
  return `menuhub_member:${slug}`;
}
function loadMember(slug: string): MemberRecord | null {
  try {
    const raw = localStorage.getItem(memberKey(slug));
    return raw ? (JSON.parse(raw) as MemberRecord) : null;
  } catch {
    return null;
  }
}

function cartStorageKey(slug: string) {
  return `menuhub_cart:${slug}`;
}
function loadCart(slug: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(cartStorageKey(slug));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export default function PublicOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [checkout, setCheckout] = useState(false);
  const [placed, setPlaced] = useState<CreatedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [isMember, setIsMember] = useState(false);
  const [returningMember, setReturningMember] = useState<MemberRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const money = (v: number) => formatMoney(v, menu?.currency);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const savedCart = loadCart(slug);
    if (Object.keys(savedCart).length > 0) setCart(savedCart);

    if (slug === "demo") {
      // ── DEV MOCK: no backend needed — visit /order/demo ──
      setMenu(MOCK_MENU);
      setActiveCategory(MOCK_MENU.categories[0]?.name ?? null);
      setForm((f) => ({ ...f, payment_method: MOCK_MENU.payment_methods[0] ?? "cash" }));
      return;
    }
    publicApi<PublicMenu>(`/api/public/shops/${slug}/menu`)
      .then((data) => {
        setMenu(data);
        setActiveCategory(data.categories[0]?.name ?? null);
        setForm((f) => ({ ...f, payment_method: data.payment_methods[0] ?? "cash" }));
      })
      .catch(() => setNotFound(true));
    const member = loadMember(slug);
    if (member) {
      setReturningMember(member);
      setIsMember(true);
      setForm((f) => ({ ...f, ...member }));
    }
  }, [slug]);

  useEffect(() => {
    const clean = Object.fromEntries(Object.entries(cart).filter(([, qty]) => qty > 0));
    if (Object.keys(clean).length === 0) {
      localStorage.removeItem(cartStorageKey(slug));
    } else {
      localStorage.setItem(cartStorageKey(slug), JSON.stringify(clean));
    }
  }, [cart, slug]);

  const allItems = useMemo(() => {
    const map: Record<string, PublicMenuItem> = {};
    menu?.categories.forEach((c) => c.items.forEach((i) => (map[i.id] = i)));
    return map;
  }, [menu]);

  function itemPrice(itemId: string, variantName: string | null): number {
    const item = allItems[itemId];
    if (!item) return 0;
    if (variantName && item.variants) {
      const v = item.variants.find((v) => v.name === variantName);
      if (v) return v.price;
    }
    return item.price;
  }

  const cartLines = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartCount = cartLines.reduce((n, [, q]) => n + q, 0);
  const subtotal = cartLines.reduce(
    (sum, [key, qty]) => {
      const { itemId, variantName } = parseCartKey(key);
      return sum + itemPrice(itemId, variantName) * qty;
    },
    0,
  );
  const preview = computeDiscount(subtotal, menu?.campaigns ?? []);
  const total = subtotal - preview.amount;
  // Nudge: closest campaign whose minimum the cart hasn't reached yet
  const nudge = (menu?.campaigns ?? [])
    .filter(
      (c) =>
        c.discount_type !== "none" && subtotal > 0 && subtotal < c.min_order_amount,
    )
    .sort((a, b) => a.min_order_amount - b.min_order_amount)[0];

  function adjust(id: string, delta: number, variant?: string | null) {
    const key = cartKey(id, variant);
    setCart((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + delta) }));
  }

  function scrollToCategory(name: string) {
    setActiveCategory(name);
    sectionRefs.current[name]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function forgetMember() {
    localStorage.removeItem(memberKey(slug));
    setReturningMember(null);
    setIsMember(false);
    setForm(EMPTY_FORM);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let order: CreatedOrder;

      if (slug === "demo") {
        // ── DEV MOCK: simulate network delay then return fake order ──
        await new Promise((r) => setTimeout(r, 800));
        order = makeMockOrder(total, subtotal, preview.amount) as CreatedOrder;
      } else {
        order = await publicApi<CreatedOrder>(`/api/public/shops/${slug}/orders`, {
          method: "POST",
          body: {
            customer: {
              name: form.name.trim(),
              phone: form.phone.trim(),
              email: form.email.trim() || null,
              address: form.delivery_address.trim() || null,
            },
            items: cartLines.map(([key, qty]) => {
              const { itemId, variantName } = parseCartKey(key);
              return { menu_item_id: itemId, quantity: qty, variant_name: variantName };
            }),
            delivery_type: form.delivery_type,
            delivery_address:
              form.delivery_type === "delivery" ? form.delivery_address.trim() : null,
            postal_code:
              form.delivery_type === "delivery" ? form.postal_code.trim() : null,
            payment_method: form.payment_method,
            notes: form.notes.trim() || null,
          },
        });
      }

      if (isMember) {
        localStorage.setItem(
          memberKey(slug),
          JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            delivery_address: form.delivery_address.trim(),
          } satisfies MemberRecord),
        );
      } else {
        localStorage.removeItem(memberKey(slug));
      }
      setPlaced(order);
      setCart({});
      setCheckout(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- shell states ---------- */
  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf6f0]">
        <p className="text-stone-500">Shop not found.</p>
      </main>
    );
  }
  if (!menu) {
    return (
      <main className="min-h-screen bg-[#faf6f0] p-4">
        <div className="mx-auto max-w-lg animate-pulse space-y-4 pt-10">
          <div className="h-8 w-2/3 rounded-lg bg-stone-200" />
          <div className="h-4 w-1/3 rounded bg-stone-200" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-200" />
          ))}
        </div>
      </main>
    );
  }

  /* ---------- success ---------- */
  if (placed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf6f0] p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_8px_40px_rgba(120,80,40,0.12)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <IconCheck />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900 [font-family:var(--font-display)]">
            Order placed!
          </h1>
          <p className="mt-2 text-stone-600">
            <span className="font-semibold text-stone-900">{placed.order_number}</span> at{" "}
            {menu.shop_name}
          </p>
          <p className="mt-3 text-3xl font-bold text-amber-800">
            {money(placed.total_amount)}
          </p>
          {placed.discount_amount > 0 && (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
              <IconTag /> You saved {money(placed.discount_amount)}
              {placed.campaign_title && ` · ${placed.campaign_title}`}
            </p>
          )}
          {placed.estimated_ready_at && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
              <IconClock />
              Ready around{" "}
              {new Date(placed.estimated_ready_at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {isMember && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <IconSparkle /> Member details saved — next order is one tap away
            </p>
          )}
          {placed.paynow_qr && (
            <div className="mt-5 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-bold text-stone-900">Pay with PayNow</p>
              <p className="mt-0.5 text-xs text-stone-500">
                Scan with any Singapore banking app — the amount and order reference are
                already filled in. The shop confirms your payment shortly after.
              </p>
              <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3 shadow-sm">
                <QRCodeSVG value={placed.paynow_qr} size={180} marginSize={1} />
              </div>
              <p className="mt-2 text-xs font-medium text-stone-600">
                {money(placed.total_amount)} · Ref {placed.order_number}
              </p>
            </div>
          )}
          <Link
            href={`/order/${slug}/status/${placed.id}`}
            className="mt-6 block w-full cursor-pointer rounded-xl bg-amber-700 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Track your order
          </Link>
          {menu.facebook_page_id && (
            <a
              href={`https://m.me/${menu.facebook_page_id}?ref=order:${placed.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-stone-700 transition-colors duration-200 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <IconMessenger /> Get updates on Messenger
            </a>
          )}
          <button
            onClick={() => setPlaced(null)}
            className="mt-4 cursor-pointer text-sm font-medium text-amber-700 transition-colors duration-200 hover:text-amber-900"
          >
            Order something else
          </button>
        </div>
      </main>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-500 transition-colors duration-200 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20";
  const labelClass = "mb-1.5 block text-sm font-semibold text-stone-700";

  /* ---------- main menu screen ---------- */
  return (
    <main className="min-h-screen bg-[#faf6f0] pb-32">
      {/* Hero header */}
      <header className="relative overflow-hidden px-4 pb-12 pt-8 text-amber-50">
        {menu.order_page?.banner_image_url ? (
          <>
            <img
              src={menu.order_page.banner_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-stone-900/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900 to-amber-800" />
        )}
        <div className="relative mx-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Order online
          </p>
          <h1 className="mt-1 text-3xl font-bold [font-family:var(--font-display)]">
            {menu.shop_name}
          </h1>
          {menu.order_page?.banner_headline && (
            <h2 className="mt-2 text-lg font-semibold text-amber-100">
              {menu.order_page.banner_headline}
            </h2>
          )}
          {menu.order_page?.banner_subtitle && (
            <p className="mt-0.5 text-sm text-white/80">{menu.order_page.banner_subtitle}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <IconClock /> ~{menu.estimated_wait_minutes} min prep
            </span>
            {returningMember && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-100">
                <IconSparkle /> Welcome back, {returningMember.name.split(" ")[0]}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Announcement bar */}
      {menu.order_page?.announcement && (
        <section aria-label="Announcement" className="mx-auto max-w-lg px-4 pt-3">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
              menu.order_page.announcement_style === "warning"
                ? "bg-amber-100 text-amber-900"
                : menu.order_page.announcement_style === "info"
                  ? "bg-blue-50 text-blue-800"
                  : "bg-green-50 text-green-800"
            }`}
          >
            <IconMegaphone />
            {menu.order_page.announcement}
          </div>
        </section>
      )}

      {/* Opening hours */}
      {menu.order_page?.opening_hours && (
        <section aria-label="Opening hours" className="mx-auto max-w-lg px-4 pt-3">
          <p className="flex items-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2 text-xs font-medium text-stone-600">
            <IconClock /> {menu.order_page.opening_hours}
          </p>
        </section>
      )}

      {/* Promo carousel */}
      {menu.campaigns.length > 0 && (
        <section aria-label="Promotions" className="mx-auto max-w-lg px-4 pt-4">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {menu.campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="relative w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(120,80,40,0.15)] first:ml-0"
              >
                {campaign.image_url ? (
                  <>
                    <img
                      src={campaign.image_url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 to-stone-900/30" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-amber-800" />
                )}
                <div className="relative p-4 text-white">
                  {campaign.discount_label && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      <IconTag /> {campaign.discount_label}
                    </span>
                  )}
                  <h3 className="mt-2 text-lg font-bold [font-family:var(--font-display)]">
                    {campaign.title}
                  </h3>
                  {campaign.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/85">
                      {campaign.description}
                    </p>
                  )}
                  {campaign.ends_at && (
                    <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-white/70">
                      Until {new Date(campaign.ends_at).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Gallery and social links */}
      <GallerySection
        items={menu.order_page?.media_gallery ?? []}
        instagramHandle={menu.order_page?.instagram_handle}
        tiktokUsername={menu.order_page?.tiktok_username}
        facebookPageUrl={menu.order_page?.facebook_page_url}
      />

      {/* Category chips */}
      {menu.categories.length > 1 && (
        <nav className={`sticky top-0 z-10 px-4 ${menu.campaigns.length > 0 || (menu.order_page?.media_gallery && menu.order_page.media_gallery.length > 0) ? "mt-4" : "-mt-5"}`}>
          <div className="mx-auto max-w-lg">
            <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(120,80,40,0.10)] [scrollbar-width:none]">
              {menu.categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => scrollToCategory(category.name)}
                  className={`shrink-0 cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    activeCategory === category.name
                      ? "bg-amber-700 text-white"
                      : "text-stone-600 hover:bg-amber-50 hover:text-amber-800"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Menu sections */}
      <div className="mx-auto max-w-lg px-4 pt-6">
        {menu.categories.map((category) => (
          <section
            key={category.name}
            ref={(el) => {
              sectionRefs.current[category.name] = el;
            }}
            className="mb-8 scroll-mt-24"
          >
            <h2 className="mb-3 text-xl font-bold text-stone-900 [font-family:var(--font-display)]">
              {category.name}
            </h2>
            {/* Horizontal image-card scroll strip */}
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {category.items.map((item) => {
                const hasVariants = item.variants && item.variants.length > 0;
                const selVariant = hasVariants ? (selectedVariant[item.id] ?? item.variants[0].name) : null;
                const displayPrice = hasVariants
                  ? item.variants.find((v) => v.name === selVariant)?.price ?? item.price
                  : item.price;
                const itemKeys = hasVariants
                  ? item.variants.map((v) => cartKey(item.id, v.name))
                  : [cartKey(item.id)];
                const totalQty = itemKeys.reduce((n, k) => n + (cart[k] ?? 0), 0);
                const curKey = cartKey(item.id, selVariant);
                const curQty = cart[curKey] ?? 0;
                return (
                  <article
                    key={item.id}
                    className={`relative flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(120,80,40,0.07)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(120,80,40,0.15)] ${
                      totalQty > 0 ? "ring-2 ring-amber-600/70" : ""
                    }`}
                  >
                    {/* Image */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-4xl font-bold text-amber-700 [font-family:var(--font-display)]"
                      >
                        {item.name.charAt(0)}
                      </div>
                    )}

                    {/* Cart badge */}
                    {totalQty > 0 && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-[11px] font-bold text-white shadow">
                        {totalQty}
                      </span>
                    )}

                    {/* Info */}
                    <div className="flex flex-1 flex-col p-2.5">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-amber-800">
                        {money(displayPrice)}
                      </p>

                      {/* Variant selector */}
                      {hasVariants && (
                        <select
                          value={selVariant ?? ""}
                          onChange={(e) =>
                            setSelectedVariant({ ...selectedVariant, [item.id]: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-stone-200 px-1.5 py-1 text-[11px] focus:border-amber-500 focus:outline-none"
                        >
                          {item.variants.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} — {money(v.price)}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Add / stepper */}
                      <div className="mt-auto pt-2">
                        {curQty === 0 ? (
                          <button
                            onClick={() => adjust(item.id, +1, selVariant)}
                            aria-label={`Add ${item.name}`}
                            className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-amber-700 py-1.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          >
                            <IconPlus /> Add
                          </button>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl bg-amber-50 px-1 py-1">
                            <button
                              onClick={() => adjust(item.id, -1, selVariant)}
                              aria-label={`Remove one ${item.name}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-amber-800 transition-colors duration-200 hover:bg-amber-100 focus:outline-none"
                            >
                              <IconMinus />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-stone-900" aria-live="polite">
                              {curQty}
                            </span>
                            <button
                              onClick={() => adjust(item.id, +1, selVariant)}
                              aria-label={`Add one ${item.name}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-amber-700 text-white transition-colors duration-200 hover:bg-amber-800 focus:outline-none"
                            >
                              <IconPlus />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky cart bar */}
      {cartCount > 0 && !checkout && (
        <div className="fixed inset-x-0 bottom-0 z-10 p-4">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setCheckout(true)}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl bg-amber-700 px-5 py-4 text-white shadow-[0_8px_30px_rgba(120,80,40,0.35)] transition-colors duration-200 hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <IconBag />
                {cartCount} item{cartCount > 1 ? "s" : ""}
                {preview.amount > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    −{money(preview.amount)} promo
                  </span>
                )}
              </span>
              <span className="text-sm font-bold">
                Checkout · {money(total)}
              </span>
            </button>
            {nudge && (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-center text-xs font-medium text-amber-800 shadow-sm">
                Add {money(nudge.min_order_amount - subtotal)} more for{" "}
                {nudge.discount_label ?? "a discount"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Checkout sheet */}
      {checkout && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-stone-900/50 backdrop-blur-sm sm:items-center sm:p-4">
          {/* Sheet container — fixed height, flex column so children can stick */}
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white sm:rounded-3xl">

            {/* ── STICKY HEADER: title ── */}
            <div className="shrink-0 rounded-t-3xl bg-white px-6 pt-6 pb-3 sm:rounded-t-3xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCheckout(false)}
                  aria-label="Back to menu"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors duration-200 hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <IconChevronLeft />
                </button>
                <h2 className="text-xl font-bold text-stone-900 [font-family:var(--font-display)]">
                  Your order
                </h2>
              </div>
            </div>

            {/* ── STICKY ORDER SUMMARY: items + total ── */}
            <div className="shrink-0 border-b border-stone-100 bg-white px-6 pb-4">
              <ul className="divide-y divide-stone-100 rounded-2xl bg-stone-50 px-4">
                {cartLines.map(([key, qty]) => {
                  const { itemId, variantName } = parseCartKey(key);
                  const item = allItems[itemId];
                  const label = variantName ? `${item?.name} (${variantName})` : (item?.name ?? key);
                  const price = itemPrice(itemId, variantName);
                  return (
                    <li key={key} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-full bg-white p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              const { itemId: id, variantName: vn } = parseCartKey(key);
                              adjust(id, -1, vn);
                            }}
                            aria-label={`Remove one ${label}`}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-amber-800 hover:bg-amber-50"
                          >
                            <IconMinus />
                          </button>
                          <span className="w-4 text-center text-xs font-bold">{qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const { itemId: id, variantName: vn } = parseCartKey(key);
                              adjust(id, +1, vn);
                            }}
                            aria-label={`Add one ${label}`}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-amber-800 hover:bg-amber-50"
                          >
                            <IconPlus />
                          </button>
                        </div>
                        <span className="font-medium text-stone-800">{label}</span>
                      </div>
                      <span className="font-semibold text-stone-900">
                        {money(price * qty)}
                      </span>
                    </li>
                  );
                })}
                {preview.amount > 0 && (
                  <li className="flex items-center justify-between py-2.5 text-sm font-semibold text-green-700">
                    <span className="flex items-center gap-1.5">
                      <IconTag /> {preview.campaign?.title ?? "Promotion"}
                    </span>
                    <span>−{money(preview.amount)}</span>
                  </li>
                )}
                {/* Sticky total row */}
                <li className="flex items-center justify-between py-3 font-bold text-stone-900">
                  <span className="flex items-center gap-1.5">
                    <IconBag />
                    {cartCount} item{cartCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-2 text-amber-800">
                    {preview.amount > 0 && (
                      <span className="text-sm font-medium text-stone-400 line-through">
                        {money(subtotal)}
                      </span>
                    )}
                    {money(total)}
                  </span>
                </li>
              </ul>
            </div>

            {/* ── SCROLLABLE FORM BODY ── */}
            <form
              onSubmit={submit}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]"
            >
              {error && (
                <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              {/* Contact info */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500">
                    <IconUser /> Your details
                  </h3>
                  {returningMember && (
                    <button
                      type="button"
                      onClick={forgetMember}
                      className="cursor-pointer text-xs font-medium text-stone-500 transition-colors duration-200 hover:text-red-600"
                    >
                      Not {returningMember.name.split(" ")[0]}? Clear
                    </button>
                  )}
                </div>
                <div>
                  <label htmlFor="co-name" className={labelClass}>Name</label>
                  <input
                    id="co-name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="co-phone" className={labelClass}>Phone number</label>
                  <input
                    id="co-phone"
                    required
                    type="tel"
                    inputMode="tel"
                    minLength={6}
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="co-email" className={labelClass}>
                    Email <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <input
                    id="co-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Membership opt-in */}
              <label
                htmlFor="co-member"
                className={`mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors duration-200 ${
                  isMember ? "border-amber-600 bg-amber-50" : "border-stone-200 hover:border-amber-300"
                }`}
              >
                <input
                  id="co-member"
                  type="checkbox"
                  checked={isMember}
                  onChange={(e) => setIsMember(e.target.checked)}
                  className="mt-1 h-5 w-5 cursor-pointer accent-amber-700"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-bold text-stone-900">
                    <IconSparkle /> Become a member — it&apos;s free
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
                    We&apos;ll remember your details on this device for one-tap checkout, and the
                    shop can reward you as a returning customer. Untick to order as a guest.
                  </span>
                </span>
              </label>

              {/* Delivery */}
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
                  Receive it
                </h3>
                <div className="flex gap-2" role="radiogroup" aria-label="Delivery type">
                  {(["pickup", "delivery"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={form.delivery_type === mode}
                      onClick={() => setForm({ ...form, delivery_type: mode })}
                      className={`flex-1 cursor-pointer rounded-xl border-2 px-3 py-3 text-sm font-bold capitalize transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        form.delivery_type === mode
                          ? "border-amber-600 bg-amber-50 text-amber-900"
                          : "border-stone-200 text-stone-500 hover:border-amber-300"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {form.delivery_type === "delivery" && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label htmlFor="co-address" className={labelClass}>Delivery address</label>
                      <input
                        id="co-address"
                        required
                        autoComplete="street-address"
                        value={form.delivery_address}
                        onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="co-postal" className={labelClass}>
                        Postal code{" "}
                        <span className="font-normal text-stone-500">
                          ({menu.currency === "SGD" ? "6 digits" : "5-6 digits"})
                        </span>
                      </label>
                      <input
                        id="co-postal"
                        required
                        inputMode="numeric"
                        pattern={menu.currency === "SGD" ? "\\d{6}" : "\\d{5,6}"}
                        maxLength={6}
                        autoComplete="postal-code"
                        value={form.postal_code}
                        onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                        className={`${inputClass} w-40`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
                  Pay with
                </h3>
                <div className="flex gap-2" role="radiogroup" aria-label="Payment method">
                  {menu.payment_methods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={form.payment_method === method}
                      onClick={() => setForm({ ...form, payment_method: method })}
                      className={`flex-1 cursor-pointer rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        form.payment_method === method
                          ? "border-amber-600 bg-amber-50 text-amber-900"
                          : "border-stone-200 text-stone-500 hover:border-amber-300"
                      }`}
                    >
                      {PAYMENT_LABELS[method] ?? method}
                    </button>
                  ))}
                </div>
                {form.payment_method === "paynow" && (
                  <p className="mt-2 text-xs text-stone-500">
                    You&apos;ll get a PayNow QR to scan with your banking app after placing the
                    order.
                  </p>
                )}
              </div>

              <div className="mb-5">
                <label htmlFor="co-notes" className={labelClass}>
                  Notes <span className="font-normal text-stone-500">(optional)</span>
                </label>
                <textarea
                  id="co-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. less sugar, call on arrival…"
                  className={`${inputClass} h-20 resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full cursor-pointer rounded-2xl bg-amber-700 py-4 text-base font-bold text-white shadow-[0_8px_30px_rgba(120,80,40,0.35)] transition-colors duration-200 hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "Placing your order…" : `Place order · ${money(total)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
