"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import type { GalleryItem } from "@/lib/types";

const IconX = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default function MediaLightbox({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Close"
        >
          <IconX />
        </button>

        {item.source === "tiktok" && item.embed_html ? (
          <div
            className="flex items-center justify-center p-2"
            dangerouslySetInnerHTML={{ __html: item.embed_html }}
          />
        ) : item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="max-h-[85vh] w-auto max-w-full object-contain"
          />
        ) : (
          <p className="p-8 text-sm text-stone-500">Unable to load media</p>
        )}

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-t border-stone-100 px-4 py-2.5 text-center text-xs font-medium text-amber-700 hover:underline"
          >
            {item.source === "tiktok" ? "View on TikTok →" : "View on Facebook →"}
          </a>
        )}
      </div>
    </div>
  );
}
