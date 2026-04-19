"use client";

import { useState, useEffect } from "react";
import type { PriceComparison, Retailer, GroceryItem } from "@/lib/types";
import PriceDisclaimer from "./PriceDisclaimer";

interface Props {
  comparisons: PriceComparison[];
  items: GroceryItem[];
  onNavigate: (screen: "map" | "list" | "compare" | "checkout" | "track") => void;
  setWinnerStore: (store: Retailer) => void;
  handleAddToCart: (comparison: PriceComparison) => void;
  cartLoading: boolean;
  pricingError: string | null;
  isDesktop: boolean;
}

function fmt(n: number) { return `$${n.toFixed(2)}`; }

function WinnerCard({ winner, second, revealed }: { winner: PriceComparison; second?: PriceComparison; revealed: boolean }) {
  const savings = second ? second.subtotal - winner.subtotal : 0;
  return (
    <div
      style={{
        background: "var(--green)",
        borderRadius: 20,
        padding: "24px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(22,163,74,0.25)",
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
        Best Value
      </span>

      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 8, marginBottom: 2 }}>
        {winner.retailer.postalCode}
      </div>
      <div
        style={{
          fontFamily: "var(--font-syne), Syne, sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: "white",
          marginBottom: 4,
        }}
      >
        {winner.retailer.name}
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
          {fmt(winner.subtotal)}
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

      {revealed && savings > 0.01 && (
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
    </div>
  );
}

function StoreList({ comparisons, winner }: { comparisons: PriceComparison[]; winner: PriceComparison }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {comparisons.map((c, i) => (
        <div
          key={c.retailer.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "white",
            borderRadius: 14,
            border: `1.5px solid ${i === 0 ? "var(--green)" : "var(--border)"}`,
            boxShadow: i === 0 ? "0 2px 12px rgba(22,163,74,0.1)" : "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 99,
              background: i === 0 ? "var(--green)" : "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              color: i === 0 ? "white" : "var(--muted)",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.retailer.name}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.retailer.postalCode}</div>
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: i === 0 ? "var(--green)" : "var(--text)",
            }}
          >
            {fmt(c.subtotal)}
          </div>
          {i > 0 && (
            <div style={{ color: "var(--muted)", fontSize: 12, minWidth: 40, textAlign: "right" }}>
              +{fmt(c.subtotal - winner.subtotal)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailsTable({ comparisons, items }: { comparisons: PriceComparison[]; items: GroceryItem[] }) {
  const top3 = comparisons.slice(0, 3);
  return (
    <div
      style={{
        background: "white",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `1fr repeat(${top3.length}, 72px)`,
          padding: "10px 14px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--muted)",
          gap: 4,
        }}
      >
        <span>Item</span>
        {top3.map((c) => (
          <span
            key={c.retailer.id}
            style={{
              textAlign: "right",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.retailer.name.split(" ")[0]}
          </span>
        ))}
      </div>

      {items.map((item, idx) => {
        const prices = top3.map((c) => {
          const match = c.items.find((m) => m.item.id === item.id);
          return match?.price ?? 0;
        });
        const minP = Math.min(...prices.filter((p) => p > 0));

        return (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: `1fr repeat(${top3.length}, 72px)`,
              padding: "12px 14px",
              borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
              {item.unit !== "each" && (
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.unit}</div>
              )}
            </div>
            {prices.map((p, ci) => (
              <span
                key={ci}
                style={{
                  textAlign: "right",
                  fontWeight: p === minP && p > 0 ? 700 : 400,
                  color: p === minP && p > 0 ? "var(--green)" : p > 0 ? "var(--text)" : "var(--border)",
                  fontSize: 13,
                }}
              >
                {p > 0 ? fmt(p) : "—"}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function RetailerComparison({
  comparisons,
  items,
  onNavigate,
  setWinnerStore,
  handleAddToCart,
  cartLoading,
  pricingError,
  isDesktop,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "details">("summary");

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (comparisons.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          color: "var(--muted)",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14 }}>No price comparison available yet.</div>
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

  const winner = comparisons[0];
  const second = comparisons[1];

  function handleOrder() {
    setWinnerStore(winner.retailer);
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
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* Left: tabs + view */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tabBar}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {pricingError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#dc2626",
                  marginBottom: 16,
                }}
              >
                {pricingError}
              </div>
            )}
            {activeTab === "summary" && <StoreList comparisons={comparisons} winner={winner} />}
            {activeTab === "details" && <DetailsTable comparisons={comparisons} items={items} />}
            <div style={{ marginTop: 16 }}>
              <PriceDisclaimer />
            </div>
          </div>
        </div>

        {/* Right: winner hero + CTA */}
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
            <WinnerCard winner={winner} second={second} revealed={revealed} />
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              Based on your {items.length} item{items.length !== 1 ? "s" : ""},{" "}
              {winner.retailer.name} offers the best total price.
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
              Order from {winner.retailer.name} — {fmt(winner.subtotal)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {tabBar}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {pricingError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#dc2626",
              marginBottom: 16,
            }}
          >
            {pricingError}
          </div>
        )}
        {activeTab === "summary" && (
          <>
            <WinnerCard winner={winner} second={second} revealed={revealed} />
            <StoreList comparisons={comparisons} winner={winner} />
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
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
          Order from {winner.retailer.name} — {fmt(winner.subtotal)}
        </button>
        <button
          onClick={() => handleAddToCart(winner)}
          disabled={cartLoading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 24px",
            borderRadius: 14,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            cursor: cartLoading ? "not-allowed" : "pointer",
            border: "none",
            background: "var(--green-light)",
            color: "var(--green)",
            opacity: cartLoading ? 0.65 : 1,
          }}
        >
          {cartLoading ? "Adding to cart…" : "Add to Kroger Cart"}
        </button>
      </div>
    </div>
  );
}
