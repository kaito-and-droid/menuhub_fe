"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_URL, api, getSession } from "@/lib/api";
import type { GalleryItem } from "@/lib/types";

interface SeoConfig {
  title_template: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
}

interface OrderPageConfig {
  banner_image_url: string | null;
  banner_headline: string | null;
  banner_subtitle: string | null;
  announcement: string | null;
  announcement_style: "info" | "warning" | "promo";
  show_address: boolean;
  show_phone: boolean;
  opening_hours: string | null;
  instagram_handle: string | null;
  tiktok_username: string | null;
  facebook_page_url: string | null;
  media_gallery: GalleryItem[];
  menu_layout: "grid" | "list";
}

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
  order_page: OrderPageConfig;
  seo: SeoConfig;
  menu_layout?: "grid" | "list";
}

/* ---- Inline icons (Lucide-style, 24x24 viewBox, stroke-based) ---- */
type IconProps = { className?: string };
const CameraIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const MusicIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
const MenuIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);
const CloseIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);
const CheckIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CopyIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const LinkIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const TrashIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition-colors duration-200 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

const TABS = [
  { id: "general", label: "General" },
  { id: "messenger", label: "Messenger" },
  { id: "appearance", label: "Appearance" },
  { id: "share", label: "Share & Embed" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const shopId = getSession()?.shop_id;
  const base = `/api/shops/${shopId}/settings`;

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const [seo, setSeo] = useState<SeoConfig>({
    title_template: "",
    description: "",
    keywords: "",
    og_image_url: "",
  });
  const [orderPage, setOrderPage] = useState<OrderPageConfig>({
    banner_image_url: "",
    banner_headline: "",
    banner_subtitle: "",
    announcement: "",
    announcement_style: "promo",
    show_address: true,
    show_phone: true,
    opening_hours: "",
    instagram_handle: "",
    tiktok_username: "",
    facebook_page_url: "",
    media_gallery: [],
    menu_layout: "grid",
  });
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [infoSaved, setInfoSaved] = useState(false);
  const [fbSaved, setFbSaved] = useState(false);
  const [seoSaved, setSeoSaved] = useState(false);
  const [appearnaceSaved, setAppearanceSaved] = useState(false);
  const [paynowSaved, setPaynowSaved] = useState(false);

  const flash = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2200);
  };

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
      setSeo({
        title_template: data.seo.title_template ?? "",
        description: data.seo.description ?? "",
        keywords: data.seo.keywords ?? "",
        og_image_url: data.seo.og_image_url ?? "",
      });
      setOrderPage({
        banner_image_url: data.order_page.banner_image_url ?? "",
        banner_headline: data.order_page.banner_headline ?? "",
        banner_subtitle: data.order_page.banner_subtitle ?? "",
        announcement: data.order_page.announcement ?? "",
        announcement_style: data.order_page.announcement_style,
        show_address: data.order_page.show_address,
        show_phone: data.order_page.show_phone,
        opening_hours: data.order_page.opening_hours ?? "",
        instagram_handle: data.order_page.instagram_handle ?? "",
        tiktok_username: data.order_page.tiktok_username ?? "",
        facebook_page_url: data.order_page.facebook_page_url ?? "",
        media_gallery: data.order_page.media_gallery ?? [],
        menu_layout: data.order_page.menu_layout ?? "grid",
      });
      setGalleryItems(data.order_page.media_gallery ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncFacebook() {
    setSyncing(true);
    setGalleryMsg(null);
    try {
      const items = await api<GalleryItem[]>(`${base}/gallery/sync-facebook`, { method: "POST" });
      setGalleryItems(items);
      setGalleryMsg(`Synced ${items.filter((i) => i.source === "facebook_photo").length} Facebook photos`);
    } catch (err) {
      setGalleryMsg(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function addTikTok() {
    if (!tiktokUrl.trim()) return;
    setGalleryMsg(null);
    try {
      const items = await api<GalleryItem[]>(`${base}/gallery/tiktok`, {
        method: "POST",
        body: { url: tiktokUrl.trim() },
      });
      setGalleryItems(items);
      setTiktokUrl("");
      setGalleryMsg("TikTok video added");
    } catch (err) {
      setGalleryMsg(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function deleteGalleryItem(itemId: string) {
    setGalleryMsg(null);
    try {
      const items = await api<GalleryItem[]>(`${base}/gallery/${itemId}`, { method: "DELETE" });
      setGalleryItems(items);
    } catch (err) {
      setGalleryMsg(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const data = await api<ShopSettings>(base, { method: "PATCH", body });
      setSettings(data);
      setSeo({
        title_template: data.seo.title_template ?? "",
        description: data.seo.description ?? "",
        keywords: data.seo.keywords ?? "",
        og_image_url: data.seo.og_image_url ?? "",
      });
      setOrderPage({
        banner_image_url: data.order_page.banner_image_url ?? "",
        banner_headline: data.order_page.banner_headline ?? "",
        banner_subtitle: data.order_page.banner_subtitle ?? "",
        announcement: data.order_page.announcement ?? "",
        announcement_style: data.order_page.announcement_style,
        show_address: data.order_page.show_address,
        show_phone: data.order_page.show_phone,
        opening_hours: data.order_page.opening_hours ?? "",
        instagram_handle: data.order_page.instagram_handle ?? "",
        tiktok_username: data.order_page.tiktok_username ?? "",
        facebook_page_url: data.order_page.facebook_page_url ?? "",
        media_gallery: data.order_page.media_gallery ?? [],
        menu_layout: data.order_page.menu_layout ?? "grid",
      });
      setGalleryItems(data.order_page.media_gallery ?? []);
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
    }).then(() => flash(setInfoSaved));
  }

  function togglePayment(method: string) {
    if (!settings) return;
    void save({
      payment_methods: { ...settings.payment_methods, [method]: !settings.payment_methods[method] },
    });
  }

  function savePaynow() {
    void save({
      paynow_proxy_type: paynow.proxy_type,
      paynow_proxy_value: paynow.proxy_value.trim() || null,
    }).then(() => flash(setPaynowSaved));
  }

  function saveFacebook(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { facebook_page_id: fb.page_id.trim() || null };
    if (fb.token.trim()) body.facebook_page_access_token = fb.token.trim();
    void save(body).then(() => flash(setFbSaved));
    setFb((f) => ({ ...f, token: "" }));
  }

  function saveSeo() {
    void save({
      seo: {
        title_template: seo.title_template?.trim() || null,
        description: seo.description?.trim() || null,
        keywords: seo.keywords?.trim() || null,
        og_image_url: seo.og_image_url?.trim() || null,
      },
    }).then(() => flash(setSeoSaved));
  }

  function saveAppearance() {
    void save({
      order_page: {
        banner_image_url: orderPage.banner_image_url?.trim() || null,
        banner_headline: orderPage.banner_headline?.trim() || null,
        banner_subtitle: orderPage.banner_subtitle?.trim() || null,
        announcement: orderPage.announcement?.trim() || null,
        announcement_style: orderPage.announcement_style,
        show_address: orderPage.show_address,
        show_phone: orderPage.show_phone,
        opening_hours: orderPage.opening_hours?.trim() || null,
        instagram_handle: orderPage.instagram_handle?.trim() || null,
        tiktok_username: orderPage.tiktok_username?.trim() || null,
        facebook_page_url: orderPage.facebook_page_url?.trim() || null,
        media_gallery: galleryItems,
        menu_layout: orderPage.menu_layout,
      },
    }).then(() => flash(setAppearanceSaved));
  }

  function copy(text: string, tag: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!settings) {
    return (
      <p className="text-sm text-stone-500" role="status">
        {error ?? "Loading settings…"}
      </p>
    );
  }

  const orderUrl = `${window.location.origin}/order/${settings.slug}`;
  const embedSnippet = `<iframe src="${orderUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  const webhookUrl = `${API_URL}/webhooks/facebook`;

  const SavedBadge = ({ show }: { show: boolean }) =>
    show ? (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 motion-safe:animate-in motion-safe:fade-in">
        <CheckIcon className="h-4 w-4" /> Saved
      </span>
    ) : null;

  const SectionCard = ({
    title,
    description,
    children,
    action,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-stone-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
          <p className="text-sm text-stone-500">Configure your shop, messaging, and customer-facing page.</p>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              activeTab === tab.id
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-6">
          <SectionCard title="Shop info" description="Basic details customers see and we use for receipts.">
            <form onSubmit={saveInfo} className="space-y-4">
              <div>
                <label htmlFor="shop_name" className="mb-1 block text-sm font-medium text-stone-700">
                  Shop name
                </label>
                <input
                  id="shop_name"
                  required
                  value={form.shop_name}
                  onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-stone-700">
                    Phone
                  </label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium text-stone-700">
                  Address
                </label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="prep" className="mb-1 block text-sm font-medium text-stone-700">
                    Preparation time (min)
                  </label>
                  <input
                    id="prep"
                    type="number"
                    min={1}
                    max={240}
                    value={form.prep_minutes}
                    onChange={(e) => setForm({ ...form, prep_minutes: e.target.value })}
                    className={`${inputClass} w-32`}
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="mb-1 block text-sm font-medium text-stone-700">
                    Currency
                  </label>
                  <select
                    id="currency"
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
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save shop info"}
                </button>
                <SavedBadge show={infoSaved} />
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Payment methods" description="Choose how customers can pay for orders.">
            <div className="space-y-3">
              {[
                { key: "cash", label: "Cash on pickup / delivery" },
                { key: "bank_transfer", label: "Bank transfer" },
              ].map((method) => (
                <label key={method.key} className="flex cursor-pointer items-center justify-between text-sm">
                  <span className="text-stone-700">{method.label}</span>
                  <input
                    type="checkbox"
                    checked={settings.payment_methods[method.key] ?? false}
                    onChange={() => togglePayment(method.key)}
                    disabled={busy}
                    className="h-4 w-4 cursor-pointer accent-amber-600"
                  />
                </label>
              ))}
              <label
                className={`flex items-center justify-between text-sm ${
                  settings.currency === "SGD" ? "cursor-pointer" : "cursor-not-allowed opacity-50"
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
                  disabled={busy || settings.currency !== "SGD" || !settings.paynow_proxy_value}
                  className="h-4 w-4 cursor-pointer accent-amber-600"
                />
              </label>
              <label className="flex cursor-not-allowed items-center justify-between text-sm opacity-50">
                <span className="text-stone-700">
                  Stripe <span className="text-xs text-stone-500">(coming in Phase 2)</span>
                </span>
                <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              </label>
            </div>

            <div className="mt-5 rounded-lg bg-stone-50 p-4">
              <p className="mb-3 text-sm font-medium text-stone-700">PayNow details (Singapore)</p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="pn-type" className="mb-1 block text-xs font-medium text-stone-500">
                    Proxy type
                  </label>
                  <select
                    id="pn-type"
                    value={paynow.proxy_type}
                    onChange={(e) => setPaynow({ ...paynow, proxy_type: e.target.value })}
                    className={`${inputClass} w-28`}
                  >
                    <option value="UEN">UEN</option>
                    <option value="MOBILE">Mobile</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="pn-value" className="mb-1 block text-xs font-medium text-stone-500">
                    {paynow.proxy_type === "UEN" ? "UEN" : "SG mobile number"}
                  </label>
                  <input
                    id="pn-value"
                    value={paynow.proxy_value}
                    onChange={(e) => setPaynow({ ...paynow, proxy_value: e.target.value })}
                    placeholder={paynow.proxy_type === "UEN" ? "e.g. 201403121W" : "e.g. 91234567"}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !paynow.proxy_value.trim()}
                  onClick={savePaynow}
                  className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save PayNow
                </button>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Customers scan a QR embedding the exact amount + order number; you confirm each payment
                with &quot;Mark paid&quot; on the Orders page.
              </p>
              <div className="mt-2">
                <SavedBadge show={paynowSaved} />
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "messenger" && (
        <SectionCard
          title="Facebook Messenger"
          description="Customers get order updates in Messenger and can check status by sending their order number to your Page."
          action={
            settings.facebook_connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                <CheckIcon className="h-3.5 w-3.5" /> Connected
              </span>
            ) : null
          }
        >
          <form onSubmit={saveFacebook} className="space-y-4">
            <div>
              <label htmlFor="fb-page" className="mb-1 block text-sm font-medium text-stone-700">
                Facebook Page ID
              </label>
              <input
                id="fb-page"
                value={fb.page_id}
                onChange={(e) => setFb({ ...fb, page_id: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fb-token" className="mb-1 block text-sm font-medium text-stone-700">
                Page access token{" "}
                <span className="font-normal text-stone-500">
                  (write-only — leave blank to keep the current one)
                </span>
              </label>
              <input
                id="fb-token"
                type="password"
                value={fb.token}
                onChange={(e) => setFb({ ...fb, token: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={busy}
                className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save Facebook settings"}
              </button>
              <SavedBadge show={fbSaved} />
            </div>
          </form>

          <div className="mt-5 rounded-lg bg-stone-50 p-4 text-xs text-stone-600">
            <p className="mb-2 font-medium text-stone-700">Webhook setup (in your FB App):</p>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-500">Callback URL:</span>
                <code className="rounded bg-white px-1.5 py-0.5 text-stone-700">{webhookUrl}</code>
                <button
                  type="button"
                  onClick={() => copy(webhookUrl, "wh")}
                  className="inline-flex cursor-pointer items-center gap-1 font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
                >
                  <CopyIcon className="h-3.5 w-3.5" /> {copied === "wh" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-500">Verify token:</span>
                <code className="rounded bg-white px-1.5 py-0.5 text-stone-700">menuhub-verify</code>
                <span className="text-stone-500">(or your FACEBOOK_VERIFY_TOKEN)</span>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === "appearance" && (
        <div className="space-y-6">
          <SectionCard
            title="SEO & search visibility"
            description="Customise how your order page appears in search results and social shares."
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="seo-title" className="mb-1 block text-sm font-medium text-stone-700">
                  Page title template{" "}
                  <span className="font-normal text-stone-500">(use {"{shop_name}"} as placeholder)</span>
                </label>
                <input
                  id="seo-title"
                  value={seo.title_template ?? ""}
                  onChange={(e) => setSeo({ ...seo, title_template: e.target.value })}
                  placeholder="e.g. {shop_name} — Order Online"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="seo-desc" className="mb-1 block text-sm font-medium text-stone-700">
                  Meta description
                </label>
                <textarea
                  id="seo-desc"
                  value={seo.description ?? ""}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  placeholder="A short description for search engine results…"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label htmlFor="seo-key" className="mb-1 block text-sm font-medium text-stone-700">
                  Keywords <span className="font-normal text-stone-500">(comma-separated)</span>
                </label>
                <input
                  id="seo-key"
                  value={seo.keywords ?? ""}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  placeholder="e.g. pho, vietnamese food, order online"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="seo-og" className="mb-1 block text-sm font-medium text-stone-700">
                  OG image URL{" "}
                  <span className="font-normal text-stone-500">(shown when shared on social media)</span>
                </label>
                <input
                  id="seo-og"
                  value={seo.og_image_url ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_image_url: e.target.value })}
                  placeholder="https://…"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveSeo}
                  className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save SEO settings"}
                </button>
                <SavedBadge show={seoSaved} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Order page appearance"
            description="Customise the top banner shown on your public order page."
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="bn-hl" className="mb-1 block text-sm font-medium text-stone-700">
                  Banner headline
                </label>
                <input
                  id="bn-hl"
                  value={orderPage.banner_headline ?? ""}
                  onChange={(e) => setOrderPage({ ...orderPage, banner_headline: e.target.value })}
                  placeholder="e.g. Grand Opening"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="bn-sub" className="mb-1 block text-sm font-medium text-stone-700">
                  Banner subtitle
                </label>
                <input
                  id="bn-sub"
                  value={orderPage.banner_subtitle ?? ""}
                  onChange={(e) => setOrderPage({ ...orderPage, banner_subtitle: e.target.value })}
                  placeholder="e.g. 20% off your first order"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="bn-img" className="mb-1 block text-sm font-medium text-stone-700">
                  Banner image URL{" "}
                  <span className="font-normal text-stone-500">(optional — leave blank for a gradient)</span>
                </label>
                <input
                  id="bn-img"
                  value={orderPage.banner_image_url ?? ""}
                  onChange={(e) => setOrderPage({ ...orderPage, banner_image_url: e.target.value })}
                  placeholder="https://…"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="announce" className="mb-1 block text-sm font-medium text-stone-700">
                  Announcement <span className="font-normal text-stone-500">(shown below the banner)</span>
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="announce"
                    value={orderPage.announcement ?? ""}
                    onChange={(e) => setOrderPage({ ...orderPage, announcement: e.target.value })}
                    placeholder="e.g. New menu items added!"
                    className={`${inputClass} flex-1`}
                  />
                  <select
                    value={orderPage.announcement_style}
                    onChange={(e) =>
                      setOrderPage({ ...orderPage, announcement_style: e.target.value as "info" | "warning" | "promo" })
                    }
                    className={`${inputClass} w-full sm:w-28`}
                  >
                    <option value="promo">Promo</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="hours" className="mb-1 block text-sm font-medium text-stone-700">
                  Opening hours
                </label>
                <input
                  id="hours"
                  value={orderPage.opening_hours ?? ""}
                  onChange={(e) => setOrderPage({ ...orderPage, opening_hours: e.target.value })}
                  placeholder="e.g. Mon–Fri 8am–8pm, Sat–Sun 9am–6pm"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="layout" className="mb-1 block text-sm font-medium text-stone-700">
                  Menu layout
                </label>
                <select
                  id="layout"
                  value={orderPage.menu_layout}
                  onChange={(e) => setOrderPage({ ...orderPage, menu_layout: e.target.value as "grid" | "list" })}
                  className={`${inputClass} w-40`}
                >
                  <option value="grid">Grid (default)</option>
                  <option value="list">List</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ig" className="mb-1 block text-sm font-medium text-stone-700">
                    Instagram
                  </label>
                  <input
                    id="ig"
                    value={orderPage.instagram_handle ?? ""}
                    onChange={(e) => setOrderPage({ ...orderPage, instagram_handle: e.target.value })}
                    placeholder="username"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="tt" className="mb-1 block text-sm font-medium text-stone-700">
                    TikTok
                  </label>
                  <input
                    id="tt"
                    value={orderPage.tiktok_username ?? ""}
                    onChange={(e) => setOrderPage({ ...orderPage, tiktok_username: e.target.value })}
                    placeholder="username"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveAppearance}
                  className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save order page settings"}
                </button>
                <SavedBadge show={appearnaceSaved} />
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Live preview
              </p>
              <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <div
                  className="flex h-24 items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-center"
                  style={
                    orderPage.banner_image_url
                      ? { backgroundImage: `url(${orderPage.banner_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                >
                  <div>
                    <p className="text-base font-bold text-white drop-shadow">
                      {orderPage.banner_headline || settings.shop_name}
                    </p>
                    {orderPage.banner_subtitle && (
                      <p className="text-xs text-white/90">{orderPage.banner_subtitle}</p>
                    )}
                  </div>
                </div>
                {orderPage.announcement && (
                  <div
                    className={`px-4 py-2 text-xs font-medium ${
                      orderPage.announcement_style === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : orderPage.announcement_style === "info"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {orderPage.announcement}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 text-xs text-stone-500">
                  <span className="capitalize">{orderPage.menu_layout} layout</span>
                  <span className="flex gap-3">
                    {orderPage.instagram_handle && <span>@{orderPage.instagram_handle}</span>}
                    {orderPage.tiktok_username && <span>@{orderPage.tiktok_username}</span>}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Media gallery"
            description="Show photos from your Facebook Page and TikTok videos on your order page. Gallery items appear below the promo carousel for customers to browse."
          >
            {galleryMsg && (
              <p className="mb-4 rounded-md bg-blue-50 p-2.5 text-xs font-medium text-blue-800" role="status">
                {galleryMsg}
              </p>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={syncing}
                onClick={syncFacebook}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CameraIcon className="h-4 w-4" />
                {syncing ? "Syncing…" : "Sync Facebook photos"}
              </button>
            </div>

            <div className="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="tt-url" className="mb-1 block text-xs font-medium text-stone-500">
                  TikTok video URL
                </label>
                <input
                  id="tt-url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@shop/video/123…"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                disabled={!tiktokUrl.trim()}
                onClick={addTikTok}
                className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {galleryItems.length > 0 ? (
              <ul className="space-y-2">
                {[...galleryItems]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg bg-stone-50 p-2.5"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-200 text-stone-500">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : item.source === "tiktok" ? (
                          <MusicIcon className="h-5 w-5" />
                        ) : (
                          <CameraIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800">
                          {item.source === "tiktok" ? "TikTok video" : "Facebook photo"}
                        </p>
                        {item.source_url && (
                          <p className="truncate text-xs text-stone-500">{item.source_url}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteGalleryItem(item.id)}
                        aria-label="Delete media item"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                      >
                        <TrashIcon className="h-3.5 w-3.5" /> Delete
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">No media items yet. Sync from Facebook or add a TikTok URL.</p>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === "share" && (
        <SectionCard
          title="Order page & embed"
          description="Share your order link anywhere, or embed the form on your website / Facebook Page tab."
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <LinkIcon className="h-4 w-4 shrink-0 text-stone-400" />
            <a href={orderUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-700 hover:underline">
              {orderUrl}
            </a>
            <button
              type="button"
              onClick={() => copy(orderUrl, "url")}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
            >
              <CopyIcon className="h-3.5 w-3.5" /> {copied === "url" ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex items-start gap-2">
            <code className="block flex-1 overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              {embedSnippet}
            </code>
            <button
              type="button"
              onClick={() => copy(embedSnippet, "embed")}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-amber-700 transition-colors duration-200 hover:text-amber-800"
            >
              <CopyIcon className="h-3.5 w-3.5" /> {copied === "embed" ? "Copied!" : "Copy"}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
