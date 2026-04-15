import type { GroceryItem, Retailer } from "./types";

const BASE_URL =
  process.env.INSTACART_BASE_URL ?? "https://connect.dev.instacart.tools";
const API_KEY = process.env.INSTACART_API_KEY ?? "";

const authHeaders: HeadersInit = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Returns retailers near the given postal code.
 * Falls back to mock data when INSTACART_API_KEY is not set.
 */
export async function getRetailers(postalCode: string): Promise<Retailer[]> {
  if (!API_KEY) {
    return [
      { id: "retailer-1", name: "Whole Foods Market", logoUrl: "", postalCode },
      { id: "retailer-2", name: "Safeway", logoUrl: "", postalCode },
      { id: "retailer-3", name: "Kroger", logoUrl: "", postalCode },
    ];
  }

  const res = await fetch(
    `${BASE_URL}/idp/v1/retailers?postal_code=${encodeURIComponent(postalCode)}`,
    { headers: authHeaders }
  );

  if (!res.ok) throw new Error(`getRetailers failed: ${res.status}`);

  // TODO: map actual response shape once IDP docs confirmed
  const data = (await res.json()) as { retailers: Retailer[] };
  return data.retailers;
}

/**
 * Creates an Instacart recipe/handoff link for the given items.
 * Falls back to the Instacart homepage when INSTACART_API_KEY is not set.
 */
export async function createRecipeLink(
  title: string,
  lineItems: GroceryItem[]
): Promise<string> {
  if (!API_KEY) {
    return "https://www.instacart.com";
  }

  const res = await fetch(`${BASE_URL}/idp/v1/products/recipe`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title,
      line_items: lineItems.map(({ name, quantity, unit }) => ({
        name,
        quantity,
        unit,
      })),
    }),
  });

  if (!res.ok) throw new Error(`createRecipeLink failed: ${res.status}`);

  // TODO: map actual response shape once IDP docs confirmed
  const data = (await res.json()) as { url: string };
  return data.url;
}
