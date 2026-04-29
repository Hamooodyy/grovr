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
      Estimated subtotal based on current Instacart listed prices. Final total
      may vary and does not include delivery fees, service fees, taxes, or
      promotions applied at checkout.
    </p>
  );
}
