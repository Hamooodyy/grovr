"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { Retailer } from "@/lib/types";

// Fix Leaflet's default marker icon paths broken by Next.js bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makePin(fill: string, stroke: string) {
  return L.divIcon({
    html: `<svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -38],
    className: "",
  });
}

const defaultPin = makePin("#3b82f6", "#1d4ed8");
const bestPin    = makePin("#16a34a", "#14532d");

const userPin = L.divIcon({
  html: `<div style="
    width:18px;height:18px;
    border-radius:50%;
    background:#2563eb;
    border:3px solid white;
    box-shadow:0 0 0 3px rgba(37,99,235,0.35),0 2px 6px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
  className: "",
});

interface Props {
  stores: Retailer[];
  radiusInMiles: number;
  bestStoreId?: string;
  userLatLng?: [number, number] | null;
}

function MapController({ center, radiusMeters }: { center: [number, number]; radiusMeters: number }) {
  const map = useMap();
  const prev = useRef("");
  const key = `${center[0].toFixed(4)},${center[1].toFixed(4)},${radiusMeters}`;

  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    const deg = radiusMeters / 111_320;
    map.fitBounds([
      [center[0] - deg, center[1] - deg],
      [center[0] + deg, center[1] + deg],
    ]);
  }, [map, center, radiusMeters, key]);

  return null;
}

export default function StoreMap({ stores, radiusInMiles, bestStoreId, userLatLng }: Props) {
  const valid = stores.filter((s) => s.lat != null && s.lng != null);
  if (valid.length === 0) return null;

  const storeAvg: [number, number] = [
    valid.reduce((sum, s) => sum + s.lat!, 0) / valid.length,
    valid.reduce((sum, s) => sum + s.lng!, 0) / valid.length,
  ];
  const center: [number, number] = userLatLng ?? storeAvg;
  const radiusMeters = radiusInMiles * 1609.34;

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 0, overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", minHeight: 320 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} radiusMeters={radiusMeters} />
        <Circle
          center={center}
          radius={radiusMeters}
          pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.07, weight: 1.5 }}
        />
        {valid.map((store) => (
          <Marker
            key={store.id}
            position={[store.lat!, store.lng!]}
            icon={store.id === bestStoreId ? bestPin : defaultPin}
          >
            <Popup>
              <div className="text-sm">
                {store.id === bestStoreId && (
                  <span className="inline-block text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded mb-1">
                    Best price
                  </span>
                )}
                <p className="font-semibold text-zinc-900">{store.name}</p>
                <p className="text-zinc-500 text-xs">{store.postalCode}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {userLatLng && (
          <Marker position={userLatLng} icon={userPin}>
            <Popup>
              <p className="text-sm font-semibold text-zinc-900">Your location</p>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
