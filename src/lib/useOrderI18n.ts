"use client";

import { useCallback, useState } from "react";
import {
  OrderLocale,
  ORDER_LOCALES,
  persistOrderLocale,
  resolveOrderLocale,
  translate,
} from "./order-i18n";

export function useOrderI18n(initialSearch = ""): {
  locale: OrderLocale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: OrderLocale) => void;
  locales: OrderLocale[];
} {
  const [locale, setLocaleState] = useState<OrderLocale>(() =>
    resolveOrderLocale(
      typeof window !== "undefined"
        ? window.location.search
        : initialSearch,
    ).locale,
  );

  const setLocale = useCallback((l: OrderLocale) => {
    persistOrderLocale(l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  return { locale, t, setLocale, locales: ORDER_LOCALES };
}
