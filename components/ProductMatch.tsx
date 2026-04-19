import type { ProductMatch as ProductMatchType } from "@/lib/types";
import PriceDisclaimer from "./PriceDisclaimer";

interface Props {
  match: ProductMatchType;
}

export default function ProductMatch({ match }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{match.matchedName}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          Searching for: {match.item.name}
          {match.item.quantity > 1 ? ` × ${match.item.quantity}` : ""}
        </p>
      </div>
      <div className="text-right shrink-0">
        {match.price > 0 ? (
          <>
            <p className="text-sm font-semibold text-zinc-900">
              ${match.price.toFixed(2)}
            </p>
            <PriceDisclaimer />
          </>
        ) : (
          <p className="text-xs text-zinc-400 italic">Not available</p>
        )}
      </div>
    </div>
  );
}
