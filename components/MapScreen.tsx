"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Retailer } from "@/lib/types";

const StoreMap = dynamic(() => import("./StoreMap"), { ssr: false });

async function reverseGeocodeToZip(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = (await res.json()) as { address?: { postcode?: string } };
    return data.address?.postcode?.split("-")[0] ?? null;
  } catch {
    return null;
  }
}

interface Props {
  stores: Retailer[];
  storesLoading: boolean;
  locationLoading: boolean;
  locationName: string | null;
  radius: number;
  setRadius: (v: number) => void;
  zip: string;
  setZip: (v: string) => void;
  selectedStore: Retailer | null;
  setSelectedStore: (s: Retailer | null) => void;
  onNavigate: (screen: "map" | "list" | "compare" | "checkout" | "track") => void;
  userLatLng: [number, number] | null;
  isDesktop: boolean;
  hadZip?: boolean; // true if a ZIP was submitted but stores came back empty
}

function Btn({
  children,
  onClick,
  variant = "primary",
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px 24px",
    borderRadius: 14,
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
  };
  return (
    <button
      style={{
        ...base,
        ...(variant === "primary"
          ? { background: "var(--green)", color: "white" }
          : { background: "var(--green-light)", color: "var(--green)" }),
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function MapScreen({
  stores,
  storesLoading,
  locationLoading,
  locationName,
  radius,
  setRadius,
  zip,
  setZip,
  selectedStore,
  setSelectedStore,
  onNavigate,
  userLatLng,
  isDesktop,
  hadZip,
}: Props) {
  const visible = stores;
  const [locating, setLocating] = useState(false);

  async function detectLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const detected = await reverseGeocodeToZip(coords.latitude, coords.longitude);
        if (detected) setZip(detected);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  const LocationBtn = () => (
    <button
      onClick={detectLocation}
      disabled={locating}
      title="Use my location"
      style={{
        position: "absolute",
        right: 8,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: locating ? "default" : "pointer",
        padding: 4,
        display: "flex",
        alignItems: "center",
        color: "var(--green)",
        opacity: locating ? 0.5 : 1,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="var(--green)" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="7" stroke="var(--green)" strokeWidth="1.5" />
      </svg>
    </button>
  );

  if (isDesktop) {
    return (
      <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}>
        {/* Map */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {stores.length === 0 && !storesLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#e8e0d0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
                <circle cx="12" cy="10" r="3" stroke="#555" strokeWidth="1.5" />
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
                  stroke="#555"
                  strokeWidth="1.5"
                />
              </svg>
              <p style={{ color: "#888", fontSize: 14, textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
                {locationLoading
                  ? "Detecting your location…"
                  : hadZip
                  ? "No stores found. Your Instacart session may have expired — try disconnecting and reconnecting."
                  : "Enter your ZIP code to see nearby stores"}
              </p>
            </div>
          )}
          {stores.length > 0 && (
            <StoreMap stores={stores} radiusInMiles={radius} bestStoreId={selectedStore?.id} userLatLng={userLatLng} />
          )}
          {storesLoading && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "white",
                borderRadius: 10,
                padding: "8px 16px",
                boxShadow: "var(--shadow)",
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              Finding stores…
            </div>
          )}
        </div>

        {/* Right panel */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            background: "white",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#0e1f14",
          }}
        >
          <div
            style={{
              padding: "24px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* Location display / manual ZIP */}
            <div style={{ marginBottom: 16 }}>
              {locationLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
                  <svg style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="var(--border)" strokeWidth="2.5" />
                    <path d="M12 3a9 9 0 019 9" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Detecting your location…
                </div>
              ) : locationName && zip ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="10" r="3" stroke="var(--green)" strokeWidth="2" />
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="var(--green)" strokeWidth="2" />
                  </svg>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#0e1f14", flex: 1 }}>{locationName}</span>
                  <span style={{ fontSize: 11, background: "var(--green-light)", color: "var(--green)", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>Current</span>
                </div>
              ) : (
                <>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Your ZIP code
                  </label>
                  <div style={{ position: "relative" }}>
                    <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="10" r="3" stroke="var(--green)" strokeWidth="2" />
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="var(--green)" strokeWidth="2" />
                    </svg>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="e.g. 45202"
                      maxLength={10}
                      style={{ width: "100%", padding: "10px 34px 10px 34px", border: "1.5px solid var(--border)", borderRadius: 10, fontFamily: "inherit", fontSize: 13, color: "#0e1f14", outline: "none", boxSizing: "border-box" }}
                    />
                    <LocationBtn />
                  </div>
                </>
              )}
            </div>

            {/* Radius slider */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Search radius:{" "}
                  <b style={{ color: "var(--text)" }}>{radius} mi</b>
                </span>
                <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                  {visible.length} store{visible.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--muted)",
                  marginTop: 4,
                }}
              >
                <span>5 mi</span>
                <span>25 mi</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Stores in range
            </div>

            {storesLoading && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>
                Finding nearby stores…
              </div>
            )}

            {!storesLoading && stores.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>
                Enter a ZIP code above to find stores
              </div>
            )}

            {!storesLoading &&
              stores.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStore(selectedStore?.id === s.id ? null : s)}
                  style={{
                    padding: "14px",
                    borderRadius: 12,
                    marginBottom: 8,
                    cursor: "pointer",
                    border: `1.5px solid ${selectedStore?.id === s.id ? "var(--green)" : "var(--border)"}`,
                    background:
                      selectedStore?.id === s.id ? "var(--green-xlight)" : "white",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0e1f14" }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.postalCode}</div>
                </div>
              ))}
          </div>

          <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
            <Btn onClick={() => onNavigate("list")} style={{ width: "100%" }}>
              Open Shopping List →
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}>
      {/* Controls bar */}
      <div
        style={{
          padding: "14px 16px 12px",
          background: "white",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* Location display / manual ZIP */}
        <div style={{ marginBottom: 10 }}>
          {locationLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>
              <svg style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--border)" strokeWidth="2.5" />
                <path d="M12 3a9 9 0 019 9" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Detecting your location…
            </div>
          ) : locationName && zip ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="10" r="3" stroke="var(--green)" strokeWidth="2" />
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="var(--green)" strokeWidth="2" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#0e1f14", flex: 1 }}>{locationName}</span>
              <span style={{ fontSize: 11, background: "var(--green-light)", color: "var(--green)", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>Current</span>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="10" r="3" stroke="var(--green)" strokeWidth="2" />
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="var(--green)" strokeWidth="2" />
              </svg>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Enter ZIP code"
                maxLength={10}
                style={{ width: "100%", padding: "10px 34px 10px 34px", border: "1.5px solid var(--border)", borderRadius: 10, fontFamily: "inherit", fontSize: 14, color: "#0e1f14", outline: "none", boxSizing: "border-box" }}
              />
              <LocationBtn />
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
            Radius: <b style={{ color: "var(--text)" }}>{radius} mi</b>
          </span>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
            {visible.length} stores
          </span>
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {stores.length === 0 && !storesLoading ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#e8e0d0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              style={{ opacity: 0.25, display: "block" }}
            >
              <circle cx="12" cy="10" r="3" stroke="#555" strokeWidth="1.5" />
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
                stroke="#555"
                strokeWidth="1.5"
              />
            </svg>
            <p style={{ color: "#888", fontSize: 13, textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>
              {hadZip
                ? "No stores found. Your Instacart session may have expired — try reconnecting."
                : "Enter your ZIP code above to find nearby stores"}
            </p>
          </div>
        ) : (
          <StoreMap stores={stores} radiusInMiles={radius} bestStoreId={selectedStore?.id} userLatLng={userLatLng} />
        )}

        {storesLoading && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              borderRadius: 10,
              padding: "8px 14px",
              boxShadow: "var(--shadow)",
              fontSize: 13,
              color: "var(--muted)",
              zIndex: 500,
            }}
          >
            Finding stores…
          </div>
        )}

        {/* Selected store bottom sheet */}
        {selectedStore && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "white",
              borderRadius: "20px 20px 0 0",
              padding: "20px 20px 28px",
              boxShadow: "0 -4px 24px rgba(0,30,15,0.12)",
            }}
            className="animate-slide-up"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedStore.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
                  {selectedStore.postalCode}
                </div>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                style={{
                  background: "var(--bg)",
                  border: "none",
                  borderRadius: 99,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "var(--muted)",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Btn onClick={() => onNavigate("list")} style={{ flex: 1 }}>
                Shop here
              </Btn>
              <Btn variant="secondary" style={{ flex: 1 }} onClick={() => onNavigate("list")}>
                View list
              </Btn>
            </div>
          </div>
        )}

        {/* Floating My List button */}
        {!selectedStore && (
          <button
            onClick={() => onNavigate("list")}
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              background: "var(--green)",
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: "14px 20px",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              zIndex: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            My list
          </button>
        )}
      </div>
    </div>
  );
}
