"use client";

import { useState, useEffect } from "react";
import type { PriceComparison, Retailer, GroceryItem } from "@/lib/types";
import PriceDisclaimer from "./PriceDisclaimer";
import ErrorBanner from "./ErrorBanner";

interface Props {
  comparisons: PriceComparison[];
  items: GroceryItem[];
  onNavigate: (screen: "map" | "list" | "compare" | "checkout" | "track") => void;
  setWinnerStore: (store: Retailer) => void;
  pricingError: string | null;
  isDesktop: boolean;
}

function fmt(n: number) { return `$${n.toFixed(2)}`; }

function SelectedCard({
  selected,
  cheapest,
  second,
  revealed,
}: {
  selected: PriceComparison;
  cheapest: PriceComparison;
  second?: PriceComparison;
  revealed: boolean;
}) {
  const isRecommended = selected.retailer.id === cheapest.retailer.id;
  const savings = second ? second.subtotal - cheapest.subtotal : 0;
  const extraCost = selected.subtotal - cheapest.subtotal;

  return (
    <div
      style={{
        background: isRecommended ? "var(--green)" : "#1e3a5f",
        borderRadius: 20,
        padding: "24px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
        boxShadow: isRecommended
          ? "0 8px 32px rgba(22,163,74,0.25)"
          : "0 8px 32px rgba(30,58,95,0.25)",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}
      />

      <span
        style={{
          background: "rgba(255,255,255,0.2)",
          borderRadius: 99,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: "white",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {isRecommended ? "Best Value" : "Your Selection"}
      </span>

      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 8, marginBottom: 2 }}>
        {selected.retailer.postalCode}
      </div>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: "white",
          marginBottom: 4,
        }}
      >
        {selected.retailer.name}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "white",
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {fmt(selected.subtotal)}
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.5s 0.3s",
          }}
        >
          subtotal
        </span>
      </div>

      {revealed && isRecommended && savings > 0.01 && (
        <div
          style={{
            marginTop: 12,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 13,
            color: "white",
            display: "inline-block",
          }}
          className="animate-fade-in"
        >
          💰 Save <b style={{ fontSize: 15 }}>{fmt(savings)}</b> vs next best
        </div>
      )}
      {revealed && !isRecommended && extraCost > 0.01 && (
        <div
          style={{
            marginTop: 12,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 13,
            color: "white",
            display: "inline-block",
          }}
          className="animate-fade-in"
        >
          +{fmt(extraCost)} vs best value ({cheapest.retailer.name})
        </div>
      )}
    </div>
  );
}

function diffReason(c: PriceComparison, cheapest: PriceComparison): { oosCount: number; pricier: boolean } {
  const oosCount = c.items.filter((m) => m.price === 0).length;
  let coreDiff = 0;
  for (const match of c.items) {
    if (match.price === 0) continue;
    const cheapMatch = cheapest.items.find((m) => m.item.id === match.item.id);
    if (cheapMatch && cheapMatch.price > 0) coreDiff += match.price - cheapMatch.price;
  }
  return { oosCount, pricier: coreDiff > 0.01 };
}

function StoreList({
  comparisons,
  selectedIdx,
  onSelect,
}: {
  comparisons: PriceComparison[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const cheapest = comparisons[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {comparisons.map((c, i) => {
        const isSelected = i === selectedIdx;
        const isCheapest = i === 0;
        const { oosCount, pricier } = i > 0 ? diffReason(c, cheapest) : { oosCount: 0, pricier: false };
        const subtotalDiff = c.subtotal - cheapest.subtotal;

        // Build reason parts
        const reasons: string[] = [];
        if (oosCount > 0) reasons.push(`${oosCount} item${oosCount > 1 ? "s" : ""} unavailable`);
        if (pricier) reasons.push("higher prices");
        const reasonText = reasons.join(" · ");

        return (
          <div
            key={c.retailer.id}
            onClick={() => onSelect(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: "white",
              borderRadius: 14,
              border: `1.5px solid ${isSelected ? "var(--green)" : "var(--border)"}`,
              boxShadow: isSelected ? "0 2px 12px rgba(22,163,74,0.1)" : "none",
              cursor: "pointer",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          >
            {/* Price rank badge */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                background: isCheapest ? "var(--green)" : "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                color: isCheapest ? "white" : "var(--muted)",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{c.retailer.name}</span>
                {isCheapest && (
                  <span
                    style={{
                      background: "var(--green-light)",
                      color: "var(--green)",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 99,
                      padding: "1px 7px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Best Value
                  </span>
                )}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.retailer.postalCode}</div>
              {i > 0 && reasonText && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2, fontWeight: 500 }}>
                  {reasonText}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: isCheapest ? "var(--green)" : "var(--text)",
                  }}
                >
                  {fmt(c.subtotal)}
                </div>
                {i > 0 && !oosCount && (
                  <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 600 }}>
                    {fmt(subtotalDiff)} more
                  </div>
                )}
              </div>
              {/* Selection indicator */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  border: `2px solid ${isSelected ? "var(--green)" : "var(--border)"}`,
                  background: isSelected ? "var(--green)" : "white",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemDetailCard({ item, comparisons }: { item: GroceryItem; comparisons: PriceComparison[] }) {
  const [open, setOpen] = useState(false);

  const rows = comparisons.map((c) => {
    const match = c.items.find((m) => m.item.id === item.id);
    return { retailer: c.retailer, matchedName: match?.matchedName ?? "", price: match?.price ?? 0 };
  });
  const prices = rows.map((r) => r.price).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const bestRow = rows.find((r) => r.price === minPrice && minPrice > 0);

  return (
    <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Clickable header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: "var(--bg)",
          border: "none",
          borderBottom: open ? "1px solid var(--border)" : "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M6 9l6 6 6-6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Item name + size */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
          {item.size && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
              {item.size === "S" ? "Small · < 20 oz" : item.size === "M" ? "Medium · 20–79 oz" : "Large · ≥ 80 oz"}
            </div>
          )}
        </div>

        {/* Best price summary when collapsed */}
        {!open && bestRow && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{fmt(minPrice)}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{bestRow.retailer.name}</div>
          </div>
        )}
        {!open && !bestRow && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", borderRadius: 6, padding: "3px 7px" }}>
            N/A
          </span>
        )}
      </button>

      {/* Store rows — shown only when expanded */}
      {open && rows.map((row, i) => {
        const isBest = row.price > 0 && row.price === minPrice;
        const isOos = row.price === 0;
        return (
          <div
            key={row.retailer.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
              background: isBest ? "rgba(22,163,74,0.04)" : "white",
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 99, flexShrink: 0,
              background: isBest ? "var(--green)" : "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 11,
              color: isBest ? "white" : "var(--muted)",
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: isBest ? "var(--green)" : "var(--text)" }}>
                {row.retailer.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isOos ? "Not found" : row.matchedName}
              </div>
            </div>
            {isOos ? (
              <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap", flexShrink: 0 }}>
                N/A
              </span>
            ) : (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: isBest ? "var(--green)" : "var(--text)" }}>{fmt(row.price)}</div>
                {isBest && prices.length > 1 && <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 600 }}>best price</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailsTable({ comparisons, items }: { comparisons: PriceComparison[]; items: GroceryItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <ItemDetailCard key={item.id} item={item} comparisons={comparisons} />
      ))}
    </div>
  );
}

export default function RetailerComparison({
  comparisons,
  items,
  onNavigate,
  setWinnerStore,
  pricingError,
  isDesktop,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "details">("summary");
  const [selectedIdx, setSelectedIdx] = useState(0);
  // Track the previous comparisons reference so we can reset selectedIdx during
  // render when new results arrive — this is the React-endorsed alternative to
  // calling setState inside a useEffect.
  const [prevComparisons, setPrevComparisons] = useState(comparisons);
  if (comparisons !== prevComparisons) {
    setPrevComparisons(comparisons);
    setSelectedIdx(0);
  }

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);


  const allUnavailable =
    comparisons.length > 0 &&
    comparisons.every((c) => c.items.every((m) => m.price === 0));

  const emptyOrUnavailable = comparisons.length === 0 || allUnavailable;

  if (emptyOrUnavailable) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          gap: 16,
          textAlign: "center",
        }}
      >
        {allUnavailable ? (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              🚫
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>
                None of your items are available
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 280, lineHeight: 1.5 }}>
                We couldn&apos;t find any of your items at nearby stores. Try updating your list or expanding your search radius.
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: "var(--muted)" }}>No price comparison available yet.</div>
        )}
        <button
          onClick={() => onNavigate("list")}
          style={{
            background: "var(--green-light)",
            color: "var(--green)",
            border: "none",
            borderRadius: 14,
            padding: "12px 20px",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Go to shopping list →
        </button>
      </div>
    );
  }

  const cheapest = comparisons[0];
  const second = comparisons[1];
  const selected = comparisons[selectedIdx];

  function handleOrder() {
    setWinnerStore(selected.retailer);
    onNavigate("checkout");
  }

  const tabBar = (
    <div
      style={{
        display: "flex",
        background: "white",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {(["summary", "details"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            flex: 1,
            padding: "14px",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            background: activeTab === tab ? "white" : "var(--bg)",
            color: activeTab === tab ? "var(--green)" : "var(--muted)",
            borderBottom:
              activeTab === tab ? "2px solid var(--green)" : "2px solid transparent",
            textTransform: "capitalize",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}>
        {/* Left: tabs + view */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tabBar}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {pricingError && <ErrorBanner message={pricingError} />}
            {activeTab === "summary" && (
              <StoreList
                comparisons={comparisons}
                selectedIdx={selectedIdx}
                onSelect={setSelectedIdx}
              />
            )}
            {activeTab === "details" && <DetailsTable comparisons={comparisons} items={items} />}
            <div style={{ marginTop: 16 }}>
              <PriceDisclaimer />
            </div>
          </div>
        </div>

        {/* Right: selected store hero + CTA */}
        <div
          style={{
            width: 340,
            flexShrink: 0,
            background: "white",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <SelectedCard selected={selected} cheapest={cheapest} second={second} revealed={revealed} />
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              {selected.retailer.id === cheapest.retailer.id
                ? `Based on your ${items.length} item${items.length !== 1 ? "s" : ""}, ${cheapest.retailer.name} offers the best total price.`
                : `You've selected ${selected.retailer.name}. ${cheapest.retailer.name} has the lowest price for your list.`}
            </div>
          </div>
          <div style={{ padding: "20px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={handleOrder}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 24px",
                borderRadius: 14,
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: "var(--green)",
                color: "white",
              }}
            >
              Order from {selected.retailer.name} — {fmt(selected.subtotal)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
      {tabBar}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {pricingError && <ErrorBanner message={pricingError} />}
        {activeTab === "summary" && (
          <>
            <SelectedCard selected={selected} cheapest={cheapest} second={second} revealed={revealed} />
            <StoreList comparisons={comparisons} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
          </>
        )}
        {activeTab === "details" && <DetailsTable comparisons={comparisons} items={items} />}
        <div style={{ marginTop: 16 }}>
          <PriceDisclaimer />
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          background: "white",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleOrder}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 24px",
            borderRadius: 14,
            fontFamily: "inherit",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: "var(--green)",
            color: "white",
          }}
        >
          Order from {selected.retailer.name} — {fmt(selected.subtotal)}
        </button>
      </div>
    </div>
  );
}
