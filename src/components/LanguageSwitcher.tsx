"use client";

import { OrderLocale } from "@/lib/order-i18n";

export default function LanguageSwitcher({
  locale,
  onSelect,
  className = "",
}: {
  locale: OrderLocale;
  onSelect: (l: OrderLocale) => void;
  className?: string;
}) {
  const languages: { code: OrderLocale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "vi", label: "VI" },
  ];
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full bg-white/15 p-0.5 text-xs font-bold backdrop-blur ${className}`}
    >
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onSelect(l.code)}
          aria-pressed={locale === l.code}
          className={`cursor-pointer rounded-full px-2.5 py-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            locale === l.code
              ? "bg-white text-amber-900"
              : "text-amber-100 hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
