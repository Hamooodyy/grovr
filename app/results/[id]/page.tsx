import { kvGet, RESULTS_PREFIX } from "@/lib/kv";
import type { StoredResults } from "@/lib/types";
import ResultsView from "@/components/ResultsView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const stored = await kvGet<StoredResults>(`${RESULTS_PREFIX}${id}`);

  if (!stored) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            marginBottom: 20,
          }}
        >
          ⏳
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Results expired
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}>
          This comparison link has expired. Results are available for 48 hours after they&apos;re generated.
        </p>
        <a
          href="/dashboard"
          style={{
            background: "#16a34a",
            color: "white",
            padding: "12px 24px",
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Create a new grocery list
        </a>
      </div>
    );
  }

  return <ResultsView comparisons={stored.comparisons} items={stored.items} />;
}
