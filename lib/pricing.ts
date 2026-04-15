import type { ProductMatch, Retailer, PriceComparison } from "./types";

interface RetailerMatches {
  retailer: Retailer;
  items: ProductMatch[];
}

/**
 * Computes subtotals for each retailer and returns all comparisons sorted
 * cheapest-first.
 */
export function compareRetailerPrices(
  retailerMatches: RetailerMatches[]
): PriceComparison[] {
  const comparisons: PriceComparison[] = retailerMatches.map(
    ({ retailer, items }) => ({
      retailer,
      subtotal: items.reduce((sum, match) => sum + match.price, 0),
      items,
    })
  );

  return comparisons.sort((a, b) => a.subtotal - b.subtotal);
}

/**
 * Returns the lowest-cost retailer. Expects the sorted output of
 * compareRetailerPrices — comparisons[0] is always cheapest.
 */
export function findCheapestRetailer(
  comparisons: PriceComparison[]
): PriceComparison {
  if (comparisons.length === 0) {
    throw new Error("No retailer comparisons provided");
  }

  return comparisons[0];
}
