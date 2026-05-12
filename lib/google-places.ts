/**
 * lib/google-places.ts
 *
 * Discovers nearby grocery stores using the Google Places API (v1 / New).
 * Only returns stores matching the supported chains defined in store-urls.ts.
 * Unrecognized chains are silently filtered out.
 */

import type { Retailer } from "./types";
import { matchStoreConfig } from "./store-urls";

const PLACES_API_URL =
  "https://places.googleapis.com/v1/places:searchNearby";

// ---------------------------------------------------------------------------
// Address geocoding — Google Geocoding API
// ---------------------------------------------------------------------------

interface GeoCoords {
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, GeoCoords>();

async function geocodeAddress(address: string): Promise<GeoCoords | null> {
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return null;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (!data.results?.length) return null;
    const loc = data.results[0].geometry.location;
    const coords = { lat: loc.lat, lng: loc.lng };
    geocodeCache.set(cacheKey, coords);
    return coords;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Places API types
// ---------------------------------------------------------------------------

interface PlaceResult {
  id?: string;
  displayName?: { text: string; languageCode: string };
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
}

interface PlacesResponse {
  places?: PlaceResult[];
}

// ---------------------------------------------------------------------------
// Store discovery
// ---------------------------------------------------------------------------

const STORE_CACHE = new Map<string, { stores: Retailer[]; expiresAt: number }>();
const STORE_CACHE_TTL = 60 * 60 * 1_000; // 1 hour

function extractPostalCode(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

export async function getNearbyGroceryStores(
  address: string,
  radiusInMiles = 10
): Promise<Retailer[]> {
  const cacheKey = `${address.toLowerCase().trim()}:${radiusInMiles}`;
  const cached = STORE_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.stores;

  const center = await geocodeAddress(address);
  if (!center) {
    console.warn(`[places] could not geocode address "${address}"`);
    return [];
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("[places] GOOGLE_PLACES_API_KEY is not set");
    return [];
  }

  const radiusMeters = Math.round(radiusInMiles * 1609.34);

  // Search multiple place types in parallel — Target, Walmart, Costco, etc.
  // are classified as department/discount stores, not grocery stores.
  const typeGroups = [
    ["grocery_store", "supermarket"],
    ["department_store"],
    ["discount_store"],
    ["warehouse_store"],
  ];

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask":
      "places.id,places.displayName,places.location,places.formattedAddress",
  };

  const requests = typeGroups.map((types) =>
    fetch(PLACES_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
        includedTypes: types,
        maxResultCount: 20,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.warn(`[places] API error ${res.status} for types ${types.join(",")}`);
          return [] as PlaceResult[];
        }
        const data = (await res.json()) as PlacesResponse;
        return data.places ?? [];
      })
      .catch(() => [] as PlaceResult[])
  );

  const results = await Promise.all(requests);
  const places = results.flat();

  // Deduplicate by chain key — only the first (closest) location per chain
  const seen = new Set<string>();
  const stores: Retailer[] = [];

  for (const place of places) {
    const name = place.displayName?.text ?? "";
    const match = matchStoreConfig(name);
    if (!match) continue;
    if (seen.has(match.key)) continue;
    seen.add(match.key);

    const postalCode =
      extractPostalCode(place.formattedAddress ?? "") ?? "";

    stores.push({
      id: `${match.key}__gp`,
      name: match.config.displayName,
      logoUrl: "",
      postalCode,
      storefrontUrl: match.config.storefrontUrl,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    });
  }

  console.log(`[places] found ${stores.length} stores near "${address}"`);
  STORE_CACHE.set(cacheKey, { stores, expiresAt: Date.now() + STORE_CACHE_TTL });
  return stores;
}
