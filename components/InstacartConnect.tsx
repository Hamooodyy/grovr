"use client";

import { useState, useEffect } from "react";

type Status = "loading" | "connected" | "disconnected";

export default function InstacartConnect() {
  const [status, setStatus] = useState<Status>("loading");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/instacart/status")
      .then((r) => r.json())
      .then((data: { connected: boolean }) =>
        setStatus(data.connected ? "connected" : "disconnected")
      )
      .catch(() => setStatus("disconnected"));
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/instacart/connect", { method: "POST" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setStatus("connected");
      } else {
        setError(data.error ?? "Connection failed");
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/auth/instacart/disconnect", { method: "POST" });
    setStatus("disconnected");
  }

  if (status === "loading") return null;

  if (status === "connected") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "#f0fdf4",
          border: "1px solid rgba(22,163,74,0.2)",
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--green)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600, color: "var(--green)", flex: 1 }}>
          Instacart connected
        </span>
        <button
          onClick={handleDisconnect}
          style={{
            background: "none",
            border: "none",
            fontSize: 12,
            color: "var(--muted)",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: 6,
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Instacart carrot icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C9 2 7 5 7 8c0 2.5 1.5 4.5 3.5 5.5L9 20h6l-1.5-6.5C15.5 12.5 17 10.5 17 8c0-3-2-6-5-6z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Connect Instacart</div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
            Required to compare prices and build your cart
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: "#dc2626",
            background: "#fef2f2",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={connecting}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: 10,
          border: "none",
          background: connecting ? "var(--bg)" : "#f97316",
          color: connecting ? "var(--muted)" : "white",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 14,
          cursor: connecting ? "not-allowed" : "pointer",
        }}
      >
        {connecting
          ? "Waiting for login… (complete in the browser window)"
          : "Connect Instacart"}
      </button>

      {connecting && (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
          A browser window will open. Log into Instacart and this will close automatically.
        </div>
      )}
    </div>
  );
}
