"use client";

import { useState } from "react";
import type { GroceryItem, Retailer, PriceComparison } from "@/lib/types";
import PriceDisclaimer from "./PriceDisclaimer";

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

function CardIcon() {
  return (
    <div
      style={{
        width: 36,
        height: 24,
        background: "#1a1a2e",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 14,
          borderRadius: 2,
          background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          opacity: 0.9,
        }}
      />
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
  const [address, setAddress] = useState("");
  const [timeSlot, setTimeSlot] = useState(0);
  const [tip, setTip] = useState(1);

  const winnerComparison =
    comparisons.find((c) => c.retailer.id === winnerStore?.id) ?? comparisons[0];
  const subtotal = winnerComparison?.subtotal ?? 0;

  const tipLabels = ["None", "10%", "15%", "20%"];
  const tipAmounts = [0, subtotal * 0.1, subtotal * 0.15, subtotal * 0.2];
  const slots = ["ASAP (45–60 min)", "Today 2–4 PM", "Today 4–6 PM", "Tomorrow 9–11 AM"];
  const serviceFee = 2.99;
  const deliveryFee = 3.49;
  const grandTotal = subtotal + serviceFee + deliveryFee + tipAmounts[tip];

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

  function handlePlaceOrder() {
    handleAddToCart(winnerComparison!);
  }

  const deliveryFields = (
    <>
      {/* Address */}
      <div style={{ marginBottom: 24 }}>
        <SectionLabel title="Delivery Address" />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your delivery address"
          style={{
            width: "100%",
            padding: "12px",
            border: "1.5px solid var(--border)",
            borderRadius: 10,
            fontFamily: "inherit",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Time slots */}
      <div style={{ marginBottom: 24 }}>
        <SectionLabel title="Delivery Time" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {slots.map((s, i) => (
            <label
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px",
                borderRadius: 10,
                border: `1.5px solid ${timeSlot === i ? "var(--green)" : "var(--border)"}`,
                background: timeSlot === i ? "var(--green-light)" : "white",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                checked={timeSlot === i}
                onChange={() => setTimeSlot(i)}
                style={{ accentColor: "var(--green)" }}
              />
              <span style={{ fontSize: 13, fontWeight: timeSlot === i ? 600 : 400 }}>{s}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div style={{ marginBottom: 24 }}>
        <SectionLabel title="Shopper Tip" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {tipLabels.map((l, i) => (
            <button
              key={i}
              onClick={() => setTip(i)}
              style={{
                padding: "10px 8px",
                borderRadius: 10,
                fontFamily: "inherit",
                border: `1.5px solid ${tip === i ? "var(--green)" : "var(--border)"}`,
                background: tip === i ? "var(--green-light)" : "white",
                color: tip === i ? "var(--green)" : "var(--text)",
                fontWeight: tip === i ? 700 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </>
  );

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
      <div>
        <div style={{ fontWeight: 700 }}>{store.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{store.postalCode}</div>
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
    </div>
  );

  const totalsBreakdown = (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      {([
        ["Subtotal", fmt(subtotal)],
        ["Delivery fee", fmt(deliveryFee)],
        ["Service fee", fmt(serviceFee)],
        ["Shopper tip", fmt(tipAmounts[tip])],
      ] as [string, string][]).map(([k, v]) => (
        <div
          key={k}
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}
        >
          <span style={{ color: "var(--muted)" }}>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 8,
          paddingTop: 10,
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <span>Total</span>
        <span style={{ color: "var(--green)" }}>{fmt(grandTotal)}</span>
      </div>
    </div>
  );

  const paymentRow = (
    <div
      style={{
        marginTop: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px",
        border: "1.5px solid var(--green)",
        borderRadius: 10,
        background: "var(--green-light)",
      }}
    >
      <CardIcon />
      <span style={{ fontWeight: 600, fontSize: 13 }}>Visa ending in 4242</span>
      <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="m9 18 6-6-6-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );

  const errorBanner = pricingError ? (
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
  ) : null;

  const placeOrderBtn = (
    <button
      onClick={handlePlaceOrder}
      disabled={cartLoading}
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
        cursor: cartLoading ? "not-allowed" : "pointer",
        border: "none",
        background: "var(--green)",
        color: "white",
        opacity: cartLoading ? 0.65 : 1,
      }}
    >
      {cartLoading ? "Placing order…" : `Place order · ${fmt(grandTotal)}`}
    </button>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {errorBanner}
          {deliveryFields}
        </div>

        <div
          style={{
            width: 360,
            flexShrink: 0,
            background: "white",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
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
            {itemRows}
            {totalsBreakdown}
            {paymentRow}
            <div style={{ marginTop: 12 }}>
              <PriceDisclaimer />
            </div>
          </div>
          <div style={{ padding: "20px", borderTop: "1px solid var(--border)" }}>
            {placeOrderBtn}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* Store banner */}
        <div
          style={{
            background: "var(--green-light)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid rgba(22,163,74,0.2)",
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
          <div>
            <div style={{ fontWeight: 700 }}>{store.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{store.postalCode}</div>
          </div>
          <div style={{ marginLeft: "auto", fontWeight: 700, color: "var(--green)", fontSize: 15 }}>
            {fmt(subtotal)}
          </div>
        </div>

        {errorBanner}
        {deliveryFields}

        <div style={{ marginBottom: 24 }}>
          <SectionLabel title="Order Summary" />
          {itemRows}
          {totalsBreakdown}
        </div>

        <div style={{ marginBottom: 24 }}>
          <SectionLabel title="Payment" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px",
              border: "1.5px solid var(--green)",
              borderRadius: 10,
              background: "var(--green-light)",
            }}
          >
            <CardIcon />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Visa ending in 4242</span>
          </div>
        </div>

        <PriceDisclaimer />
      </div>

      <div
        style={{
          padding: "16px",
          background: "white",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {placeOrderBtn}
      </div>
    </div>
  );
}
