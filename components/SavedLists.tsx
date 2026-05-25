"use client";

import { useState, useEffect, useCallback } from "react";

interface ListSummary {
  id: number;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onLoad: (data: { items: unknown[]; address: string | null; radius: number }) => void;
  isDesktop: boolean;
}

export default function SavedLists({ onLoad, isDesktop }: Props) {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping-list?all=true");
      if (!res.ok) return;
      const data = (await res.json()) as { lists: ListSummary[] };
      setLists(data.lists);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  async function handleLoad(listId: number) {
    setLoadingId(listId);
    try {
      const res = await fetch("/api/shopping-list?action=load", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onLoad(data);
    } catch {
      // non-fatal
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(listId: number) {
    setDeletingId(listId);
    try {
      const res = await fetch("/api/shopping-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });
      if (!res.ok) return;
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch {
      // non-fatal
    } finally {
      setDeletingId(null);
    }
  }

  async function handleNewList() {
    try {
      const res = await fetch("/api/shopping-list?action=new", { method: "PUT" });
      if (!res.ok) return;
      const data = await res.json();
      onLoad(data);
    } catch {
      // non-fatal
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading lists...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: isDesktop ? "28px 32px" : "18px 16px",
      }}
    >
      {/* Header with New List button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: isDesktop ? 20 : 17,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Saved Lists
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            {lists.length === 0 ? "No saved lists yet" : `${lists.length} list${lists.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={handleNewList}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "var(--green)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          New List
        </button>
      </div>

      {/* List cards */}
      {lists.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            color: "var(--muted)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            style={{ margin: "0 auto 16px", opacity: 0.3 }}
          >
            <path
              d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p style={{ fontSize: 14, margin: "0 0 6px", fontWeight: 500 }}>
            No saved lists yet
          </p>
          <p style={{ fontSize: 13 }}>
            Use the &quot;Save List&quot; button on your shopping list to save it here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lists.map((list) => (
            <div
              key={list.id}
              style={{
                background: "white",
                borderRadius: 14,
                border: "1px solid var(--border)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {list.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{list.itemCount} item{list.itemCount !== 1 ? "s" : ""}</span>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span>{formatDate(list.updatedAt)}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleLoad(list.id)}
                  disabled={loadingId === list.id}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--green)",
                    background: "var(--green-light)",
                    color: "var(--green)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: loadingId === list.id ? "wait" : "pointer",
                    fontFamily: "inherit",
                    opacity: loadingId === list.id ? 0.6 : 1,
                  }}
                >
                  {loadingId === list.id ? "Loading..." : "Load"}
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  disabled={deletingId === list.id}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "white",
                    color: "var(--muted)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: deletingId === list.id ? "wait" : "pointer",
                    fontFamily: "inherit",
                    opacity: deletingId === list.id ? 0.6 : 1,
                  }}
                >
                  {deletingId === list.id ? "..." : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
