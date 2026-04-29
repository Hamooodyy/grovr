"use client";

import { useState } from "react";
import type { GroceryItem, ItemSize } from "@/lib/types";

interface AddItemBarProps {
  query: string;
  setQuery: (v: string) => void;
  onAdd: () => void;
}

function AddItemBar({ query, setQuery, onAdd }: AddItemBarProps) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) onAdd(); }}
        placeholder="Add an item (e.g. lactaid milk, eggs…)"
        style={{
          flex: 1,
          padding: "12px 14px",
          border: "1.5px solid var(--border)",
          borderRadius: 12,
          fontFamily: "inherit",
          fontSize: 14,
          outline: "none",
          background: "var(--bg)",
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={onAdd}
        disabled={!query.trim()}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          border: "none",
          background: query.trim() ? "var(--green)" : "var(--border)",
          color: query.trim() ? "white" : "var(--muted)",
          fontFamily: "inherit",
          fontWeight: 700,
          fontSize: 14,
          cursor: query.trim() ? "pointer" : "default",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      >
        Add
      </button>
    </div>
  );
}

function ProductThumb({ imageUrl, name, size = 48 }: { imageUrl?: string; name: string; size?: number }) {
  if (imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          background: "#f4f4f4",
          flexShrink: 0,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: "var(--green-light)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(22,163,74,0.15)",
      }}
    >
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          stroke="var(--green)"
          strokeWidth="1.8"
        />
        <path d="M3 6h18" stroke="var(--green)" strokeWidth="1.8" />
        <path d="M16 10a4 4 0 01-8 0" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block", margin: "0 auto 12px", opacity: 0.25 }}
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#888" strokeWidth="1.5" />
        <line x1="3" y1="6" x2="21" y2="6" stroke="#888" strokeWidth="1.5" />
        <path d="M16 10a4 4 0 01-8 0" stroke="#888" strokeWidth="1.5" />
      </svg>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Your list is empty</div>
      <div style={{ fontSize: 13 }}>Type an item above and press Enter to add it</div>
    </div>
  );
}

const SIZE_LABELS: { value: ItemSize; label: string; title: string; examples: string }[] = [
  { value: "S", label: "S", title: "Small · < 20 oz",    examples: "pint of cream, 16 oz soup, snack pack" },
  { value: "M", label: "M", title: "Medium · 20–79 oz",  examples: "quart of milk, standard loaf, regular box" },
  { value: "L", label: "L", title: "Large · ≥ 80 oz",    examples: "gallon of milk, family-size, 5 lb bag" },
];

function SizePill({ value, label, title, examples, active, onToggle }: {
  value: ItemSize; label: string; title: string; examples: string;
  active: boolean; onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 22, height: 22, borderRadius: 6,
          border: active ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
          background: active ? "var(--green)" : "white",
          color: active ? "white" : "var(--muted)",
          fontSize: 10, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0, lineHeight: 1,
        }}
      >
        {label}
      </button>
      {hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "#1a1a1a", color: "white",
          borderRadius: 8, padding: "7px 10px", fontSize: 11,
          whiteSpace: "nowrap", zIndex: 100, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10 }}>{examples}</div>
          <div style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: "5px solid #1a1a1a",
          }} />
        </div>
      )}
    </div>
  );
}

interface ItemListProps {
  items: GroceryItem[];
  expandedPref: string | null;
  setExpandedPref: (id: string | null) => void;
  brandPrefs: Record<string, string>;
  setBrandPref: (id: string, val: string) => void;
  setSize: (id: string, size: ItemSize | undefined) => void;
  updateQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
}

function ItemList({ items, expandedPref, setExpandedPref, brandPrefs, setBrandPref, setSize, updateQty, removeItem }: ItemListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => {
        const prefOpen = expandedPref === item.id;
        const hasPref = (brandPrefs[item.id] || "").trim().length > 0;
        return (
          <div
            key={item.id}
            style={{
              background: "white",
              borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,20,10,0.06)",
              overflow: "hidden",
            }}
            className="animate-fade-in"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
              }}
            >
              <ProductThumb imageUrl={item.imageUrl} name={item.name} size={48} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Size pills */}
                  <div style={{ display: "flex", gap: 3 }}>
                    {SIZE_LABELS.map(({ value, label, title, examples }) => (
                      <SizePill
                        key={value}
                        value={value}
                        label={label}
                        title={title}
                        examples={examples}
                        active={item.size === value}
                        onToggle={() => setSize(item.id, item.size === value ? undefined : value)}
                      />
                    ))}
                  </div>
                  {hasPref ? (
                    <span
                      onClick={() => setExpandedPref(prefOpen ? null : item.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        background: "var(--green-light)",
                        borderRadius: 99,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--green)",
                        cursor: "pointer",
                      }}
                    >
                      ♥ {brandPrefs[item.id]}
                    </span>
                  ) : (
                    <button
                      onClick={() => setExpandedPref(prefOpen ? null : item.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 9px",
                        borderRadius: 99,
                        cursor: "pointer",
                        border: "1.5px dashed var(--border)",
                        background: "white",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                      }}
                    >
                      + Brand preference
                    </button>
                  )}
                </div>
              </div>

              {/* Qty stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => updateQty(item.id, -1)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    border: "1.5px solid var(--border)",
                    background: "var(--bg)",
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    minWidth: 14,
                    textAlign: "center",
                  }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQty(item.id, 1)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    border: "1.5px solid var(--green)",
                    background: "var(--green-light)",
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--green)",
                  }}
                >
                  +
                </button>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#cbd5d1",
                  cursor: "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                  padding: "0 2px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Brand preference editor */}
            {prefOpen && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "10px 14px 12px",
                  background: "var(--bg)",
                }}
                className="animate-fade-in"
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 7,
                  }}
                >
                  Brand preference
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    value={brandPrefs[item.id] || ""}
                    onChange={(e) => setBrandPref(item.id, e.target.value)}
                    placeholder={`e.g. "Organic Valley", "store brand"…`}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      border: "1.5px solid var(--border)",
                      borderRadius: 10,
                      fontFamily: "inherit",
                      fontSize: 13,
                      outline: "none",
                      background: "white",
                    }}
                  />
                  <button
                    onClick={() => setExpandedPref(null)}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: hasPref ? "var(--green)" : "var(--border)",
                      color: hasPref ? "white" : "var(--muted)",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Done
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                  We&apos;ll match the closest available product at checkout.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  items: GroceryItem[];
  addItem: (item: Omit<GroceryItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  brandPrefs: Record<string, string>;
  setBrandPref: (id: string, val: string) => void;
  setSize: (id: string, size: ItemSize | undefined) => void;
  pricingLoading: boolean;
  pricingError: string | null;
  setPricingError: (e: string | null) => void;
  findPrices: () => void;
  onNavigate: (screen: "map" | "list" | "compare" | "checkout" | "track") => void;
  isDesktop: boolean;
}

export default function ShoppingList({
  items,
  addItem,
  removeItem,
  updateQty,
  brandPrefs,
  setBrandPref,
  setSize,
  pricingLoading,
  pricingError,
  setPricingError,
  findPrices,
  onNavigate,
  isDesktop,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedPref, setExpandedPref] = useState<string | null>(null);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // Category grouping for desktop summary panel
  const catCounts = items.reduce<Record<string, number>>((acc, item) => {
    const cat = "produce";
    acc[cat] = (acc[cat] || 0) + item.quantity;
    return acc;
  }, {});

  function handleAdd() {
    const name = query.trim();
    if (!name) return;
    addItem({ name, quantity: 1, unit: "each" });
    setQuery("");
    setPricingError(null);
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}>
        {/* Left: list */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 20px 0",
              background: "white",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <AddItemBar query={query} setQuery={setQuery} onAdd={handleAdd} />
            <div style={{ height: 16 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
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
            {items.length === 0 ? <EmptyState /> : (
              <ItemList
                items={items}
                expandedPref={expandedPref}
                setExpandedPref={setExpandedPref}
                brandPrefs={brandPrefs}
                setBrandPref={setBrandPref}
                setSize={setSize}
                updateQty={updateQty}
                removeItem={removeItem}
              />
            )}
          </div>
        </div>

        {/* Right: summary panel */}
        <div
          style={{
            width: 300,
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
                marginBottom: 4,
              }}
            >
              List Summary
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {totalQty} item{totalQty !== 1 ? "s" : ""} across{" "}
              {Object.keys(catCounts).length || 1} categor{Object.keys(catCounts).length !== 1 ? "ies" : "y"}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {/* Brand prefs */}
            {Object.entries(brandPrefs).filter(([, v]) => v).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Brand Preferences
                </div>
                {items
                  .filter((i) => brandPrefs[i.id])
                  .map((i) => (
                    <div
                      key={i.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                        color: "var(--muted)",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                        {i.name}
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--green)", flexShrink: 0 }}>
                        {brandPrefs[i.id]}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {items.length > 0 && (
              <div
                style={{
                  background: "var(--green-xlight)",
                  borderRadius: 12,
                  padding: "14px",
                  border: "1px solid rgba(22,163,74,0.15)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--green)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Items ready to compare
                </div>
                <div
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: 2,
                  }}
                >
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Compare prices to find the best deal
                </div>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={findPrices}
                disabled={pricingLoading}
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
                  cursor: pricingLoading ? "not-allowed" : "pointer",
                  border: "none",
                  background: "var(--green)",
                  color: "white",
                  opacity: pricingLoading ? 0.65 : 1,
                  transition: "all 0.15s",
                }}
              >
                {pricingLoading ? "Finding prices…" : "Compare prices →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
      <div
        style={{
          padding: "16px 16px 0",
          background: "white",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <AddItemBar query={query} setQuery={setQuery} onAdd={handleAdd} />
        <div style={{ height: 12 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
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
        {items.length === 0 ? <EmptyState /> : (
              <ItemList
                items={items}
                expandedPref={expandedPref}
                setExpandedPref={setExpandedPref}
                brandPrefs={brandPrefs}
                setBrandPref={setBrandPref}
                setSize={setSize}
                updateQty={updateQty}
                removeItem={removeItem}
              />
            )}
      </div>

      {items.length > 0 && (
        <div
          style={{
            padding: "16px",
            background: "white",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              {totalQty} item{totalQty !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => onNavigate("map")}
              style={{
                background: "none",
                border: "none",
                fontSize: 12,
                color: "var(--muted)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Change store
            </button>
          </div>
          <button
            onClick={findPrices}
            disabled={pricingLoading}
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
              cursor: pricingLoading ? "not-allowed" : "pointer",
              border: "none",
              background: "var(--green)",
              color: "white",
              opacity: pricingLoading ? 0.65 : 1,
              transition: "all 0.15s",
            }}
          >
            {pricingLoading ? "Finding prices…" : "Compare prices across stores →"}
          </button>
        </div>
      )}
    </div>
  );
}
