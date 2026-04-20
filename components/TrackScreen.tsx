"use client";

import { useState, useEffect } from "react";
import type { GroceryItem, Retailer } from "@/lib/types";

interface Props {
  items: GroceryItem[];
  winnerStore: Retailer | null;
  onNavigate: (screen: "map" | "list" | "compare" | "checkout" | "track") => void;
  isDesktop: boolean;
}

const STEPS = ["Placed", "Confirmed", "Picking", "On the way", "Delivered"];

export default function TrackScreen({ items, winnerStore, onNavigate, isDesktop }: Props) {
  const [step, setStep] = useState(2);
  const [picked, setPicked] = useState<number[]>([0, 1]);

  const orderNum = "GR-52841";
  const eta = step < 3 ? "35–45 min" : "12 min";

  // Simulate items being picked over time
  useEffect(() => {
    const t1 = setTimeout(() => setPicked([0, 1, 2]), 2500);
    const t2 = setTimeout(() => setPicked([0, 1, 2, 3]), 5000);
    const t3 = setTimeout(() => {
      setPicked([0, 1, 2, 3, 4]);
      setStep(3);
    }, 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const statusMessage =
    step === 2
      ? "🛒 Shopper is picking your items"
      : step === 3
      ? "🚗 Your order is on the way!"
      : step >= 4
      ? "✓ Delivered!"
      : "📋 Order confirmed";

  const progressSteps = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: i <= step ? "var(--green)" : "var(--bg)",
                border: `2px solid ${i <= step ? "var(--green)" : "var(--border)"}`,
                transition: "all 0.4s",
                boxShadow: i === step ? "0 0 0 4px rgba(22,163,74,0.2)" : "none",
                flexShrink: 0,
              }}
            >
              {i < step ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12 5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : i === step ? (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "white",
                  }}
                  className="animate-pulse-dot"
                />
              ) : null}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: i === step ? 700 : 400,
                color: i <= step ? "var(--green)" : "var(--muted)",
                textAlign: "center",
                maxWidth: 52,
              }}
            >
              {s}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                margin: "0 4px",
                marginBottom: 16,
                background: i < step ? "var(--green)" : "var(--border)",
                transition: "background 0.4s",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const itemPickList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const isPicked = picked.includes(i);
        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "white",
              borderRadius: 10,
              border: `1px solid ${isPicked ? "rgba(22,163,74,0.2)" : "var(--border)"}`,
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 99,
                flexShrink: 0,
                background: isPicked ? "var(--green)" : "var(--bg)",
                border: `2px solid ${isPicked ? "var(--green)" : "var(--border)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s",
              }}
            >
              {isPicked && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12 5 5 9-9" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: isPicked ? "var(--muted)" : "var(--text)",
                textDecoration: isPicked ? "line-through" : "none",
              }}
            >
              {item.name}
            </span>
            {item.quantity > 1 && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>×{item.quantity}</span>
            )}
            {isPicked && (
              <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* Left: status */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* ETA hero */}
          <div style={{ padding: "28px 32px", background: "var(--green)", flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 4 }}>
                  Estimated arrival
                </div>
                <div
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontWeight: 800,
                    fontSize: 48,
                    color: "white",
                    lineHeight: 1,
                  }}
                >
                  {eta}
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>
                  from {winnerStore?.name ?? "your store"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 4 }}>
                  Order
                </div>
                <div
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "white",
                  }}
                >
                  #{orderNum}
                </div>
              </div>
            </div>
          </div>

          {/* Progress steps */}
          <div
            style={{
              background: "white",
              padding: "24px 32px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            {progressSteps}
          </div>

          {/* Status message */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            <div
              style={{
                background: "var(--green-light)",
                borderRadius: 12,
                padding: "16px",
                border: "1px solid rgba(22,163,74,0.2)",
                marginBottom: 16,
              }}
            >
              <div
                style={{ fontWeight: 700, fontSize: 15, color: "var(--green)", marginBottom: 4 }}
              >
                {statusMessage}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Order #{orderNum} · {winnerStore?.name}
              </div>
            </div>

            {step >= 4 && (
              <button
                onClick={() => onNavigate("map")}
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
                  background: "var(--green-light)",
                  color: "var(--green)",
                }}
              >
                Start a new order
              </button>
            )}
          </div>
        </div>

        {/* Right: item pick list */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            background: "white",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                fontFamily: "Arial, sans-serif",
                marginBottom: 2,
              }}
            >
              Items
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {picked.length} of {items.length} picked
            </div>
            {/* Progress bar */}
            <div
              style={{
                height: 4,
                background: "var(--border)",
                borderRadius: 99,
                marginTop: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  background: "var(--green)",
                  width: `${(picked.length / Math.max(items.length, 1)) * 100}%`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>
                No items to track
              </div>
            ) : itemPickList}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ETA hero */}
      <div
        style={{
          padding: "24px 20px",
          background: "var(--green)",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 4 }}>
          Estimated arrival
        </div>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontWeight: 800,
            fontSize: 42,
            color: "white",
            lineHeight: 1,
          }}
        >
          {eta}
        </div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>
          from {winnerStore?.name ?? "your store"}
        </div>
      </div>

      {/* Progress */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {progressSteps}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* Status message */}
        <div
          style={{
            background: "var(--green-light)",
            borderRadius: 12,
            padding: "14px",
            marginBottom: 16,
            border: "1px solid rgba(22,163,74,0.2)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--green)", marginBottom: 2 }}>
            {statusMessage}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Order #{orderNum}</div>
        </div>

        {step < 4 && items.length > 0 && (
          <>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Items ({picked.length}/{items.length} picked)
            </div>
            {itemPickList}
          </>
        )}
      </div>

      {step >= 4 && (
        <div
          style={{
            padding: "16px",
            background: "white",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onNavigate("map")}
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
              background: "var(--green-light)",
              color: "var(--green)",
            }}
          >
            Start a new order
          </button>
        </div>
      )}
    </div>
  );
}
