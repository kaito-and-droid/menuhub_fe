import type { Metadata } from "next";
import { Karla, Playfair_Display } from "next/font/google";

const karla = Karla({ subsets: ["latin"], variable: "--font-body" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SeoData {
  title_template: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
}

async function fetchSeo(slug: string): Promise<SeoData | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/shops/${slug}/menu`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.seo ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const seo = await fetchSeo(slug);

  const shopName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const title = seo?.title_template
    ? seo.title_template.replace("{shop_name}", shopName)
    : `${shopName} — Order Online`;
  const description = seo?.description ?? `Browse the menu and order online from ${shopName}. Available for pickup and delivery.`;

  return {
    title,
    description,
    keywords: seo?.keywords ?? undefined,
    openGraph: seo?.og_image_url
      ? { title, description, images: [{ url: seo.og_image_url }] }
      : { title, description },
  };
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${karla.variable} ${playfair.variable} [font-family:var(--font-body)]`}
    >
      {children}
    </div>
  );
}
