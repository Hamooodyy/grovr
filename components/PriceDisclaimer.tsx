export default function PriceDisclaimer() {
  return (
    <p
      style={{
        fontSize: 11,
        color: "var(--muted)",
        lineHeight: 1.5,
        padding: "8px 10px",
        background: "var(--bg)",
        borderRadius: 8,
        borderLeft: "2px solid var(--border)",
      }}
    >
      Estimated subtotal based on current Kroger listed prices. Final total
      including fees and promotions may vary.
    </p>
  );
}
