/**
 * lib/google-places.ts
 *
 * Discovers nearby grocery stores using the Google Places API (v1 / New).
 * Only returns stores matching the 7 supported chains defined in store-urls.ts.
 * Unrecognized chains are silently filtered out.
 */

import type { Retailer } from "./types";
import { matchStoreConfig } from "./store-urls";

const PLACES_API_URL =
  "https://places.googleapis.com/v1/places:searchNearby";

// ---------------------------------------------------------------------------
// ZIP geocoding — Nominatim (no API key required)
// ---------------------------------------------------------------------------

interface ZipCoords {
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, ZipCoords>();

async function geocodeZip(zip: string): Promise<ZipCoords | null> {
  if (geocodeCache.has(zip)) return geocodeCache.get(zip)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`,
      { headers: { "User-Agent": "Grovr/1.0 (grocery price comparison app)" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(zip, coords);
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
  zip: string,
  radiusInMiles = 10
): Promise<Retailer[]> {
  const cacheKey = `${zip}:${radiusInMiles}`;
  const cached = STORE_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.stores;

  const center = await geocodeZip(zip);
  if (!center) {
    console.warn(`[places] could not geocode ZIP ${zip}`);
    return [];
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("[places] GOOGLE_PLACES_API_KEY is not set");
    return [];
  }

  const radiusMeters = Math.round(radiusInMiles * 1609.34);

  const res = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.formattedAddress",
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: radiusMeters,
        },
      },
      includedTypes: ["grocery_store", "supermarket"],
      maxResultCount: 20,
    }),
  });

  if (!res.ok) {
    console.error(`[places] API error ${res.status}:`, await res.text());
    return [];
  }

  const data = (await res.json()) as PlacesResponse;
  const places = data.places ?? [];

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
      extractPostalCode(place.formattedAddress ?? "") ?? zip;

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

  console.log(`[places] found ${stores.length} stores near ZIP ${zip}`);
  STORE_CACHE.set(cacheKey, { stores, expiresAt: Date.now() + STORE_CACHE_TTL });
  return stores;
}
