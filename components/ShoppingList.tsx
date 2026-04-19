"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { GroceryItem, Retailer, PriceComparison } from "@/lib/types";
import RetailerComparison from "./RetailerComparison";
import ItemSearch from "./ItemSearch";

const StoreMap = dynamic(() => import("./StoreMap"), { ssr: false });

type AppState = "building" | "loading" | "reviewing";

let itemCounter = 0;

export default function ShoppingList() {
  const [appState, setAppState] = useState<AppState>("building");
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(10);
  const [stores, setStores] = useState<Retailer[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cartLoading, setCartLoading] = useState(false);

  const zipDebounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radiusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bestStoreId = comparisons[0]?.retailer.id;
  // Pass the first store's ID to ItemSearch so autocomplete is location-scoped
  const locationId = stores[0]?.id;

  // ── Item management ────────────────────────────────────────────────────────

  function addItem(partial: Omit<GroceryItem, "id">) {
    setItems((prev) => [...prev, { ...partial, id: String(++itemCounter) }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQty(id: string, delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  }

  // ── Store fetch ────────────────────────────────────────────────────────────

  const fetchStores = useCallback(
    async (zipCode: string, radiusInMiles: number): Promise<Retailer[]> => {
      const res = await fetch(
        `/api/stores?zip=${encodeURIComponent(zipCode)}&radius=${radiusInMiles}`
      );
      if (!res.ok) throw new Error("Failed to fetch stores");
      const data = (await res.json()) as { stores: Retailer[] };
      return data.stores;
    },
    []
  );

  function handleZipChange(value: string) {
    setZip(value);
    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);
    if (!/^\d{5}$/.test(value.trim())) return;
    zipDebounceRef.current = setTimeout(async () => {
      setStoresLoading(true);
      try {
        const updated = await fetchStores(value.trim(), radius);
        setStores(updated);
        setComparisons([]);
        setAppState("building");
      } catch {
        // Non-fatal — will surface on Find Prices
      } finally {
        setStoresLoading(false);
      }
    }, 500);
  }

  function handleRadiusChange(value: number) {
    setRadius(value);
    if (!zip.trim()) return;
    if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current);
    radiusDebounceRef.current = setTimeout(async () => {
      try {
        const updated = await fetchStores(zip.trim(), value);
        setStores(updated);
        setComparisons([]);
        setAppState("building");
      } catch {
        // Silently ignore mid-slider errors
      }
    }, 400);
  }

  // ── Find Prices ────────────────────────────────────────────────────────────

  async function findPrices() {
    if (items.length === 0) { setError("Add at least one item."); return; }
    if (!zip.trim()) { setError("Enter your ZIP code."); return; }
    setError(null);
    setAppState("loading");

    try {
      const nearbyStores = stores.length > 0
        ? stores
        : await fetchStores(zip.trim(), radius);
      if (stores.length === 0) setStores(nearbyStores);

      if (nearbyStores.length === 0) {
        setError("No Kroger stores found near that ZIP. Try increasing the radius.");
        setAppState("building");
        return;
      }

      const pricingRes = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, stores: nearbyStores }),
      });
      if (!pricingRes.ok) throw new Error("Failed to fetch pricing");

      const pricingData = (await pricingRes.json()) as { comparisons: PriceComparison[] };
      setComparisons(pricingData.comparisons);
      setAppState("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setAppState("building");
    }
  }

  // ── Add to Kroger Cart ─────────────────────────────────────────────────────

  async function handleAddToCart(comparison: PriceComparison) {
    const cartItems = comparison.items
      .filter((m) => m.upc && m.price > 0)
      .map((m) => ({ upc: m.upc!, quantity: m.item.quantity }));

    if (cartItems.length === 0) {
      setError("No items with valid UPCs to add to cart.");
      return;
    }

    setCartLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      });

      if (res.status === 401) {
        const data = (await res.json()) as { error: string };
        if (data.error === "KROGER_AUTH_REQUIRED") {
          const authRes = await fetch("/api/auth/kroger/url");
          if (authRes.ok) {
            const { url } = (await authRes.json()) as { url: string };
            window.location.href = url;
          }
          return;
        }
      }

      if (!res.ok) throw new Error("Failed to add to cart");
      alert("Items added to your Kroger cart! Visit kroger.com to complete checkout.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart.");
    } finally {
      setCartLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

      {/* ── Grocery list ── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Your grocery list</h2>

        <ItemSearch onAdd={addItem} locationId={locationId} />

        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-white border border-zinc-200 px-3 py-2"
              >
                {/* Product thumbnail */}
                <div className="w-10 h-10 rounded-md bg-zinc-100 flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">?</div>
                  )}
                </div>

                {/* Name + unit */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{item.name}</p>
                  {item.unit !== "each" && (
                    <p className="text-xs text-zinc-400">{item.unit}</p>
                  )}
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-6 h-6 rounded-md border border-zinc-300 text-zinc-600 text-sm leading-none hover:bg-zinc-100 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-zinc-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-6 h-6 rounded-md border border-zinc-300 text-zinc-600 text-sm leading-none hover:bg-zinc-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="flex-shrink-0 text-zinc-400 hover:text-red-500 transition-colors text-xs ml-1"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Location + radius ── */}
      <section className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">ZIP code</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => handleZipChange(e.target.value)}
            placeholder="e.g. 45202"
            maxLength={10}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-zinc-600 mb-1">
            <span>Search radius</span>
            <span className="text-zinc-900 font-semibold">{radius} mi</span>
          </label>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={radius}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="w-full accent-green-600"
          />
          <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
            <span>5 mi</span>
            <span>25 mi</span>
          </div>
        </div>
      </section>

      {/* ── Store map ── */}
      <section>
        {storesLoading && (
          <p className="text-xs text-zinc-400 mb-2">Finding nearby stores…</p>
        )}
        {!storesLoading && stores.length > 0 && (
          <p className="text-xs font-medium text-zinc-500 mb-2">
            {stores.length} store{stores.length !== 1 ? "s" : ""} within {radius} mi
            {bestStoreId && (
              <span className="text-green-600 ml-1">— best price highlighted</span>
            )}
          </p>
        )}
        {!storesLoading && stores.length === 0 && zip.length === 5 && !storesLoading && (
          <p className="text-xs text-zinc-400 mb-2">
            No stores found within {radius} mi. Try increasing the radius.
          </p>
        )}
        <StoreMap stores={stores} radiusInMiles={radius} bestStoreId={bestStoreId} />
      </section>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Find Prices ── */}
      {appState !== "reviewing" && (
        <button
          onClick={findPrices}
          disabled={appState === "loading"}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {appState === "loading" ? "Finding prices…" : "Find Prices"}
        </button>
      )}

      {/* ── Price comparison table ── */}
      {appState === "reviewing" && comparisons.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-900">Price comparison</h2>
            <button
              onClick={() => { setAppState("building"); setComparisons([]); }}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline"
            >
              Edit list
            </button>
          </div>
          <RetailerComparison
            comparisons={comparisons}
            onAddToCart={handleAddToCart}
            cartLoading={cartLoading}
          />
        </section>
      )}

    </div>
  );
}
