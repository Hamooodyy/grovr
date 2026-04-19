import type { PriceComparison } from "@/lib/types";
import PriceDisclaimer from "./PriceDisclaimer";

interface Props {
  comparisons: PriceComparison[];
  onAddToCart: (comparison: PriceComparison) => void;
  cartLoading: boolean;
}

export default function RetailerComparison({ comparisons, onAddToCart, cartLoading }: Props) {
  if (comparisons.length === 0) return null;

  const best = comparisons[0]; // sorted cheapest-first by pricing.ts
  // Use the first comparison's item list as the canonical row order
  const groceryItems = comparisons[0].items.map((m) => m.item);

  return (
    <div className="space-y-4">
      {/* ── Comparison table ── */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200 w-40">
                Item
              </th>
              {comparisons.map((c) => {
                const isBest = c.retailer.id === best.retailer.id;
                return (
                  <th
                    key={c.retailer.id}
                    className={`px-4 py-3 text-center font-medium border-b border-zinc-200 whitespace-nowrap ${
                      isBest
                        ? "bg-green-50 text-green-800"
                        : "bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {isBest && (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          Best price
                        </span>
                      )}
                      <span>{c.retailer.name}</span>
                      <span className="text-xs font-normal text-zinc-400">{c.retailer.postalCode}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groceryItems.map((item, rowIdx) => (
              <tr key={item.id} className={rowIdx % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                <td className="px-4 py-2.5 text-zinc-700 font-medium capitalize border-b border-zinc-100">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="text-zinc-400 font-normal"> ×{item.quantity}</span>
                  )}
                </td>
                {comparisons.map((c) => {
                  const match = c.items.find((m) => m.item.id === item.id);
                  const isBest = c.retailer.id === best.retailer.id;
                  return (
                    <td
                      key={c.retailer.id}
                      className={`px-4 py-2.5 text-center border-b border-zinc-100 ${
                        isBest ? "bg-green-50/60" : ""
                      }`}
                    >
                      {match && match.price > 0 ? (
                        <span className={isBest ? "font-semibold text-zinc-900" : "text-zinc-500"}>
                          ${match.price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">N/A</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-4 py-3 font-semibold text-zinc-700 bg-zinc-50 border-t border-zinc-200">
                Subtotal
              </td>
              {comparisons.map((c) => {
                const isBest = c.retailer.id === best.retailer.id;
                return (
                  <td
                    key={c.retailer.id}
                    className={`px-4 py-3 text-center font-bold border-t border-zinc-200 ${
                      isBest ? "bg-green-50 text-green-700 text-base" : "bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    ${c.subtotal.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <PriceDisclaimer />

      {/* ── Add to cart ── */}
      <button
        onClick={() => onAddToCart(best)}
        disabled={cartLoading}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {cartLoading
          ? "Adding to cart…"
          : `Add to Kroger Cart — ${best.retailer.name} ($${best.subtotal.toFixed(2)})`}
      </button>
    </div>
  );
}
