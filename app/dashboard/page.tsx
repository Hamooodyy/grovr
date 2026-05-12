"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import type { GroceryItem, Retailer, PriceComparison } from "@/lib/types";
import ShoppingList from "@/components/ShoppingList";
import RetailerComparison from "@/components/RetailerComparison";
import CheckoutScreen from "@/components/CheckoutScreen";

type Screen = "list" | "compare" | "checkout";

const NAV: { id: Screen; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: "list",
    label: "My List",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "compare",
    label: "Compare",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 20V10M12 20V4M6 20v-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "checkout",
    label: "Checkout",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
        <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
];

const TITLES: Record<Screen, string> = {
  list: "Shopping List",
  compare: "Price Compare",
  checkout: "Checkout",
};


export default function Dashboard() {
  const [screen, setScreen] = useState<Screen>("list");
  const [isDesktop, setIsDesktop] = useState(false);

  // Shared state
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [address, setAddress] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("grovr_address") ?? "";
    }
    return "";
  });
  const [radius, setRadius] = useState(5);
  const [stores, setStores] = useState<Retailer[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Retailer | null>(null);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [winnerStore, setWinnerStore] = useState<Retailer | null>(null);
  const [brandPrefs, setBrandPrefsState] = useState<Record<string, string>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [hadAddress, setHadAddress] = useState(false);

  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radiusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Clear any pending debounce timers when the component unmounts
  useEffect(() => {
    return () => {
      if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
      if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current);
    };
  }, []);

  // ── Restore saved address on mount ───────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("grovr_address");
    if (saved && saved.trim().length >= 5) {
      setStoresLoading(true);
      fetchStores(saved.trim(), radius)
        .then((updated) => { setStores(updated); setHadAddress(true); })
        .catch(() => {})
        .finally(() => setStoresLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-detect location (only if no saved address) ─────────────────────────
  useEffect(() => {
    if (localStorage.getItem("grovr_address")) return;
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = (await res.json()) as {
            display_name?: string;
            address?: { road?: string; house_number?: string; city?: string; town?: string; village?: string; state?: string; state_code?: string; postcode?: string };
          };
          const addr = data.address;
          if (addr) {
            const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
            const city = addr.city ?? addr.town ?? addr.village;
            const state = addr.state_code ?? addr.state;
            const zip = addr.postcode?.split("-")[0];
            const fullAddress = [street, city, state, zip].filter(Boolean).join(", ");
            const displayName = [city, state].filter(Boolean).join(", ") || fullAddress;
            setLocationName(displayName);
            setAddress(fullAddress);
            localStorage.setItem("grovr_address", fullAddress);
            // Directly fetch stores without debounce — this is a one-time auto-detect
            setStoresLoading(true);
            try {
              const updated = await fetchStores(fullAddress, radius);
              setStores(updated);
              setHadAddress(true);
            } catch {
              // non-fatal
            } finally {
              setStoresLoading(false);
            }
          }
        } catch {
          // silently fall back to manual entry
        } finally {
          setLocationLoading(false);
        }
      },
      () => setLocationLoading(false),
      { timeout: 8000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Item management ─────────────────────────────────────────────────────────
  function addItem(partial: Omit<GroceryItem, "id">) {
    setItems((prev) => [...prev, { ...partial, id: crypto.randomUUID() }]);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setBrandPrefsState((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }
  function updateQty(id: string, delta: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  }
  function setBrandPref(id: string, val: string) {
    setBrandPrefsState((prev) => ({ ...prev, [id]: val }));
  }
  function setSize(id: string, size: import("@/lib/types").ItemSize | undefined) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, size } : i));
  }

  // ── Store fetch ─────────────────────────────────────────────────────────────
  const fetchStores = useCallback(async (addr: string, radiusInMiles: number): Promise<Retailer[]> => {
    const res = await fetch(`/api/stores?address=${encodeURIComponent(addr)}&radius=${radiusInMiles}`);
    if (!res.ok) throw new Error("Failed to fetch stores");
    const data = (await res.json()) as { stores: Retailer[] };
    return data.stores;
  }, []);

  function handleAddressChange(value: string) {
    setAddress(value);
    localStorage.setItem("grovr_address", value);
    setLocationName(null);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (value.trim().length < 5) return;
    addressDebounceRef.current = setTimeout(async () => {
      setStoresLoading(true);
      try {
        const updated = await fetchStores(value.trim(), radius);
        setStores(updated);
        setComparisons([]);
        setHadAddress(true);
      } catch {
        // non-fatal
      } finally {
        setStoresLoading(false);
      }
    }, 800);
  }

  function handleRadiusChange(value: number) {
    setRadius(value);
    if (!address.trim()) return;
    if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current);
    radiusDebounceRef.current = setTimeout(async () => {
      try {
        const updated = await fetchStores(address.trim(), value);
        setStores(updated);
        setComparisons([]);
      } catch {
        // silently ignore
      }
    }, 400);
  }

  // ── Find prices ─────────────────────────────────────────────────────────────
  async function findPrices() {
    if (items.length === 0) { setPricingError("Add at least one item."); return; }
    if (!address.trim()) { setPricingError("Enter your address first."); return; }
    setPricingError(null);
    setPricingLoading(true);

    try {
      const nearbyStores = stores.length > 0 ? stores : await fetchStores(address.trim(), radius);
      if (stores.length === 0) setStores(nearbyStores);

      if (nearbyStores.length === 0) {
        setPricingError("No supported stores found near that ZIP. Try increasing the radius.");
        return;
      }

      // Attach brand preferences to each item before sending to the scraper
      const itemsWithPrefs = items.map((item) => ({
        ...item,
        brandPref: brandPrefs[item.id] || undefined,
      }));

      const pricingRes = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsWithPrefs, stores: nearbyStores }),
      });
      if (!pricingRes.ok) throw new Error("Failed to fetch pricing");

      const pricingData = (await pricingRes.json()) as { comparisons: PriceComparison[] };
      setComparisons(pricingData.comparisons);
      setScreen("compare");
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPricingLoading(false);
    }
  }

  // ── Checkout handoff ────────────────────────────────────────────────────────
  function handleAddToCart(comparison: PriceComparison) {
    window.open(comparison.retailer.storefrontUrl, "_blank", "noopener,noreferrer");
    setWinnerStore(comparison.retailer);
    setScreen("checkout");
  }

  const Logo = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
            fill="rgba(255,255,255,0.25)"
            stroke="white"
            strokeWidth="1.8"
          />
          <path d="M3 6h18" stroke="white" strokeWidth="1.8" />
          <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "Arial, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: isDesktop ? "white" : "var(--text)",
        }}
      >
        Grovr
      </span>
    </div>
  );

  const screenProps = {
    items,
    addItem,
    removeItem,
    updateQty,
    brandPrefs,
    setBrandPref,
    setSize,
    address,
    setAddress: handleAddressChange,
    radius,
    setRadius: handleRadiusChange,
    stores,
    storesLoading,
    locationLoading,
    locationName,
    selectedStore,
    setSelectedStore,
    comparisons,
    pricingLoading,
    pricingError,
    setPricingError,
    winnerStore,
    setWinnerStore,
    findPrices,
    handleAddToCart,
    onNavigate: setScreen,
    isDesktop,
    hadAddress,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: isDesktop ? "#0e1f14" : "var(--bg)",
      }}
    >
      {/* ── Desktop sidebar ── */}
      {isDesktop && (
        <aside
          style={{
            width: 220,
            background: "#0e1f14",
            display: "flex",
            flexDirection: "column",
            padding: "28px 14px",
            flexShrink: 0,
          }}
        >
          <div style={{ marginBottom: 36, paddingLeft: 6 }}>
            <Logo />
          </div>

          <nav style={{ flex: 1 }}>
            {NAV.map(({ id, label, icon }) => {
              const active = screen === id;
              return (
                <button
                  key={id}
                  onClick={() => setScreen(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    textAlign: "left",
                    marginBottom: 2,
                    transition: "all 0.15s",
                    background: active ? "rgba(255,255,255,0.1)" : "transparent",
                    color: active ? "white" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {icon(active)}
                  {label}
                </button>
              );
            })}
          </nav>

          {items.length > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Your list
              </div>
              <div
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "white",
                }}
              >
                {items.length} items
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <UserButton />
          </div>

          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              lineHeight: 1.6,
              paddingLeft: 6,
            }}
          >
            Saving you money on
            <br />
            groceries, with none
            <br />
            of the hassle.
          </div>
        </aside>
      )}

      {/* ── Main content area ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          overflow: "hidden",
          ...(isDesktop ? {} : { maxWidth: 430, margin: "0 auto", width: "100%" }),
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isDesktop ? "16px 28px" : "14px 18px 12px",
            background: "white",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {!isDesktop && <Logo />}
          {isDesktop && (
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--text)",
              }}
            >
              {TITLES[screen]}
            </div>
          )}
          {!isDesktop && (
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>
              {TITLES[screen]}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {items.length > 0 && screen !== "list" && (
              <button
                onClick={() => setScreen("list")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "var(--green-light)",
                  borderRadius: 99,
                  padding: "4px 10px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 12, color: "var(--green)" }}>
                  {items.length}
                </span>
                <span style={{ fontSize: 11, color: "var(--green)" }}>items</span>
              </button>
            )}
            {!isDesktop && <UserButton />}
          </div>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {screen === "list" && <ShoppingList {...screenProps} />}
          {screen === "compare" && <RetailerComparison {...screenProps} />}
          {screen === "checkout" && <CheckoutScreen {...screenProps} />}
        </div>

        {/* Bottom nav — mobile only */}
        {!isDesktop && (
          <div
            style={{
              display: "flex",
              background: "white",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            {NAV.map(({ id, label, icon }) => {
              const active = screen === id;
              return (
                <button
                  key={id}
                  onClick={() => setScreen(id)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    padding: "10px 4px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: "none",
                    color: active ? "var(--green)" : "var(--muted)",
                    transition: "color 0.15s",
                  }}
                >
                  {icon(active)}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
