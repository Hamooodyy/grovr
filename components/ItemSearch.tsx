"use client";

import { useState, useRef, useEffect } from "react";
import type { GroceryItem, ProductSuggestion } from "@/lib/types";

interface Props {
  onAdd: (item: Omit<GroceryItem, "id">) => void;
  locationId?: string;
}

export default function ItemSearch({ onAdd, locationId }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<ProductSuggestion | null>(null);
  const [qty, setQty] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    setPendingItem(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ q: value.trim() });
        if (locationId) qs.set("locationId", locationId);
        const res = await fetch(`/api/search?${qs}`);
        const data = (await res.json()) as { products: ProductSuggestion[] };
        setSuggestions(data.products);
        setOpen(data.products.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function selectSuggestion(suggestion: ProductSuggestion) {
    setPendingItem(suggestion);
    setQty(1);
    setOpen(false);
    setQuery("");
    setSuggestions([]);
  }

  function confirmAdd() {
    if (!pendingItem) return;
    onAdd({
      name: pendingItem.name,
      quantity: qty,
      unit: pendingItem.size ?? "each",
      upc: pendingItem.upc,
      imageUrl: pendingItem.imageUrl,
    });
    setPendingItem(null);
    setQty(1);
  }

  function cancelPending() {
    setPendingItem(null);
    setQty(1);
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {/* ── Search input ── */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search for a product (e.g. milk, eggs…)"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs animate-pulse">
            …
          </span>
        )}

        {/* ── Suggestions dropdown ── */}
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.productId}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => selectSuggestion(s)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
              >
                <div className="w-10 h-10 rounded-md bg-zinc-100 flex-shrink-0 overflow-hidden">
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.imageUrl}
                      alt={s.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{s.name}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {[s.brand, s.size].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Pending item confirmation (qty selector + add button) ── */}
      {pendingItem && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
          <div className="w-10 h-10 rounded-md bg-white flex-shrink-0 overflow-hidden border border-zinc-100">
            {pendingItem.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingItem.imageUrl}
                alt={pendingItem.name}
                className="w-full h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">?</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-800 truncate">{pendingItem.name}</p>
            <p className="text-xs text-zinc-400">{pendingItem.size}</p>
          </div>
          {/* Qty stepper */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-6 h-6 rounded-md bg-white border border-zinc-300 text-zinc-600 text-sm leading-none hover:bg-zinc-100 transition-colors"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold text-zinc-900">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-6 h-6 rounded-md bg-white border border-zinc-300 text-zinc-600 text-sm leading-none hover:bg-zinc-100 transition-colors"
            >
              +
            </button>
          </div>
          <button
            onClick={confirmAdd}
            className="flex-shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Add
          </button>
          <button
            onClick={cancelPending}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
