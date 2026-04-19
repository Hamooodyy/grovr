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
    const aHasUnavailable = a.items.some((m) => m.price === 0);
    const bHasUnavailable = b.items.some((m) => m.price === 0);

    // Fully-stocked stores always rank above stores with unavailable items
    if (aHasUnavailable !== bHasUnavailable) {
      return aHasUnavailable ? 1 : -1;
    }

    return a.subtotal - b.subtotal;
  });
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
