import type { ProductMatch, Retailer, PriceComparison } from "./types";

interface RetailerMatches {
  retailer: Retailer;
  items: ProductMatch[];
}

/**
 * Computes subtotals for each retailer and returns all comparisons sorted
 * cheapest-first. Items with price === 0 are treated as unavailable (out of
 * stock or no pricing data) and are excluded from the subtotal. Stores with
 * any unavailable items are ranked after fully-stocked stores.
 */
export function compareRetailerPrices(
  retailerMatches: RetailerMatches[]
): PriceComparison[] {
  const comparisons: PriceComparison[] = retailerMatches.map(
    ({ retailer, items }) => {
      const availableItems = items.filter((m) => m.price > 0);
      return {
        retailer,
        subtotal: availableItems.reduce((sum, match) => sum + match.price, 0),
        items,
      };
    }
  );

  return comparisons.sort((a, b) => {
    const aMissing = a.items.filter((m) => m.price === 0).length;
    const bMissing = b.items.filter((m) => m.price === 0).length;

    // Fewer missing items = better. Fully-stocked stores rank first.
    if (aMissing !== bMissing) return aMissing - bMissing;

    return a.subtotal - b.subtotal;
  });
}

