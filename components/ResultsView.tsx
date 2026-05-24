"use client";

import { useState, useEffect } from "react";
import type { PriceComparison, GroceryItem } from "@/lib/types";
import RetailerComparison from "./RetailerComparison";

interface Props {
  comparisons: PriceComparison[];
  items: GroceryItem[];
}

export default function ResultsView({ comparisons, items }: Props) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") return window.matchMedia("(min-width: 768px)").matches;
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: "#16a34a" }}>
          Grovr
        </div>
        <a
          href="/dashboard"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#16a34a",
            textDecoration: "none",
          }}
        >
          Create your own list →
        </a>
      </div>

      {/* Results */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <RetailerComparison
          comparisons={comparisons}
          items={items}
          onNavigate={() => {}}
          setWinnerStore={() => {}}
          pricingError={null}
          isDesktop={isDesktop}
        />
      </div>
    </div>
  );
}
