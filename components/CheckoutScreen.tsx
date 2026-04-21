"use client";

import type { GroceryItem, Retailer, PriceComparison } from "@/lib/types";
import PriceDisclaimer from "./PriceDisclaimer";
import ErrorBanner from "./ErrorBanner";

interface Props {
  items: GroceryItem[];
  winnerStore: Retailer | null;
  comparisons: PriceComparison[];
  onNavigate: (screen: "map" | "list" | "compare" | "checkout" | "track") => void;
  handleAddToCart: (comparison: PriceComparison) => void;
  cartLoading: boolean;
  pricingError: string | null;
  isDesktop: boolean;
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 11,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 10,
      }}
    >
      {title}
    </div>
  );
}

export default function CheckoutScreen({
  items,
  winnerStore,
  comparisons,
  onNavigate,
  handleAddToCart,
  cartLoading,
  pricingError,
  isDesktop,
}: Props) {
  const winnerComparison =
    comparisons.find((c) => c.retailer.id === winnerStore?.id) ?? comparisons[0];
  const subtotal = winnerComparison?.subtotal ?? 0;
  const store = winnerStore ?? winnerComparison?.retailer ?? null;

  if (!store || !winnerComparison) {
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
        <div style={{ fontSize: 14 }}>No store selected yet.</div>
        <button
          onClick={() => onNavigate("compare")}
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
          Compare prices first →
        </button>
      </div>
    );
  }

  const storeBanner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px",
        background: "var(--green-xlight)",
        borderRadius: 12,
        marginBottom: 20,
        border: "1px solid rgba(22,163,74,0.15)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          fontWeight: 800,
          fontSize: 16,
          color: "white",
          flexShrink: 0,
        }}
      >
        {store.name[0]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{store.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{store.postalCode}</div>
      </div>
      <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 15 }}>
        {fmt(subtotal)}
      </div>
    </div>
  );

  const itemRows = (
    <div style={{ marginBottom: 16 }}>
      {items.map((item) => {
        const match = winnerComparison.items.find((m) => m.item.id === item.id);
        const price = (match?.price ?? 0) * item.quantity;
        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>×{item.quantity}</span>
              <span style={{ fontWeight: 500 }}>{item.name}</span>
            </div>
            <span>{price > 0 ? fmt(price) : "—"}</span>
          </div>
        );
      })}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 10,
          paddingTop: 10,
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        <span>Estimated subtotal</span>
        <span style={{ color: "var(--green)" }}>{fmt(subtotal)}</span>
      </div>
    </div>
  );

  const handoffNote = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: "#f0fdf4",
        borderRadius: 10,
        border: "1px solid rgba(22,163,74,0.2)",
        marginBottom: 16,
        fontSize: 13,
        color: "var(--muted)",
        lineHeight: 1.5,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <circle cx="12" cy="12" r="10" stroke="var(--green)" strokeWidth="2" />
        <path d="M12 7v5l3 3" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>
        Clicking <strong style={{ color: "var(--text)" }}>Checkout at Kroger</strong> will add
        your items to your Kroger cart. You&apos;ll complete the order — including delivery or
        pickup options — directly on kroger.com.
      </span>
    </div>
  );

  const errorBanner = pricingError ? <ErrorBanner message={pricingError} /> : null;

  const checkoutBtn = (
    <button
      onClick={() => handleAddToCart(winnerComparison)}
      disabled={cartLoading}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "14px 24px",
        borderRadius: 14,
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 600,
        cursor: cartLoading ? "not-allowed" : "pointer",
        border: "none",
        background: "var(--green)",
        color: "white",
        opacity: cartLoading ? 0.65 : 1,
      }}
    >
      {cartLoading ? (
        "Loading…"
      ) : (
        <>
          Checkout at Kroger
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 17L17 7M17 7H7M17 7v10"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
    </button>
  );

  const summaryContent = (
    <>
      <div
        style={{
          fontWeight: 800,
          fontSize: 16,
          fontFamily: "Arial, sans-serif",
          marginBottom: 16,
        }}
      >
        Order Summary
      </div>
      {storeBanner}
      <SectionLabel title="Items" />
      {itemRows}
      {handoffNote}
      <PriceDisclaimer />
    </>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* Left: context */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "var(--green-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
                fill="rgba(22,163,74,0.12)"
                stroke="var(--green)"
                strokeWidth="1.8"
              />
              <path d="M3 6h18" stroke="var(--green)" strokeWidth="1.8" />
              <path d="M16 10a4 4 0 01-8 0" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: 800,
              fontSize: 24,
              textAlign: "center",
            }}
          >
            Ready to checkout?
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--muted)",
              textAlign: "center",
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            We&apos;ll pre-load your shopping cart with Kroger for an easy checkout!
          </div>
        </div>

        {/* Right: summary + button */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            background: "white",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {errorBanner}
            {summaryContent}
          </div>
          <div style={{ padding: "20px", borderTop: "1px solid var(--border)" }}>
            {checkoutBtn}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {errorBanner}
        {summaryContent}
      </div>
      <div
        style={{
          padding: "16px",
          background: "white",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {checkoutBtn}
      </div>
    </div>
  );
}
