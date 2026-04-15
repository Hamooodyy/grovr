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
 * Returns the single lowest-cost retailer from a sorted or unsorted list of
 * comparisons. Throws if the list is empty.
 */
export function findCheapestRetailer(
  comparisons: PriceComparison[]
): PriceComparison {
  if (comparisons.length === 0) {
    throw new Error("No retailer comparisons provided");
  }

  return comparisons.reduce((cheapest, current) =>
    current.subtotal < cheapest.subtotal ? current : cheapest
  );
}
