import { useCallback, useEffect, useState } from "react";

export const CITY = "Bangalore";

// Launch areas, alphabetical. `pincode` is the area's main post office (used to prefill checkout);
// `pincodes` are the PIN codes we recognise for the area; lat/lng is the approximate area centre,
// used to match a shopper's detected location to the nearest area.
export const LOCALITIES = [
  {
    name: "Banashankari",
    pincode: "560070",
    pincodes: ["560070", "560050", "560085"],
    lat: 12.9255,
    lng: 77.5468,
  },
  { name: "Bellandur", pincode: "560103", pincodes: ["560103"], lat: 12.9304, lng: 77.6784 },
  {
    name: "BTM Layout",
    pincode: "560076",
    pincodes: ["560076", "560068"],
    lat: 12.9166,
    lng: 77.6101,
  },
  { name: "Electronic City", pincode: "560100", pincodes: ["560100"], lat: 12.8452, lng: 77.6602 },
  { name: "Hebbal", pincode: "560024", pincodes: ["560024"], lat: 13.0358, lng: 77.597 },
  { name: "HSR Layout", pincode: "560102", pincodes: ["560102"], lat: 12.9116, lng: 77.6474 },
  {
    name: "Indiranagar",
    pincode: "560038",
    pincodes: ["560038", "560008"],
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    name: "Jayanagar",
    pincode: "560041",
    pincodes: ["560041", "560011", "560069", "560082"],
    lat: 12.9308,
    lng: 77.5838,
  },
  { name: "JP Nagar", pincode: "560078", pincodes: ["560078"], lat: 12.9063, lng: 77.5857 },
  {
    name: "Koramangala",
    pincode: "560034",
    pincodes: ["560034", "560095", "560047"],
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    name: "Malleshwaram",
    pincode: "560003",
    pincodes: ["560003", "560055"],
    lat: 13.0031,
    lng: 77.5643,
  },
  { name: "Marathahalli", pincode: "560037", pincodes: ["560037"], lat: 12.9591, lng: 77.6974 },
  {
    name: "Rajajinagar",
    pincode: "560010",
    pincodes: ["560010", "560021"],
    lat: 12.991,
    lng: 77.5525,
  },
  { name: "Sarjapur Road", pincode: "560035", pincodes: ["560035"], lat: 12.91, lng: 77.687 },
  {
    name: "Whitefield",
    pincode: "560066",
    pincodes: ["560066", "560048", "560067"],
    lat: 12.9698,
    lng: 77.75,
  },
  {
    name: "Yelahanka",
    pincode: "560064",
    pincodes: ["560064", "560063"],
    lat: 13.1007,
    lng: 77.5963,
  },
] as const;

/** Farthest a detected location can be from an area's centre and still count as that area. */
export const SERVICE_RADIUS_KM = 6;

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Nearest launch area to a point, with its distance; `inRange` says whether we deliver there. */
export function nearestLocality(
  lat: number,
  lng: number,
): { name: Locality; km: number; inRange: boolean } {
  let best: { name: Locality; km: number } = { name: LOCALITIES[0].name, km: Infinity };
  for (const l of LOCALITIES) {
    const km = distanceKm(lat, lng, l.lat, l.lng);
    if (km < best.km) best = { name: l.name, km };
  }
  return { ...best, inRange: best.km <= SERVICE_RADIUS_KM };
}

/** Area for a PIN code we recognise, or null. */
export function localityForPincode(pin: string): Locality | null {
  return LOCALITIES.find((l) => (l.pincodes as readonly string[]).includes(pin))?.name ?? null;
}

export type Locality = (typeof LOCALITIES)[number]["name"];

export const LOCALITY_NAMES = LOCALITIES.map((l) => l.name) as Locality[];

export function isLocality(value: unknown): value is Locality {
  return typeof value === "string" && (LOCALITY_NAMES as string[]).includes(value);
}

export function pincodeFor(locality: Locality | null): string {
  return LOCALITIES.find((l) => l.name === locality)?.pincode ?? "";
}

const STORAGE_KEY = "roots-locality";
const OPEN_EVENT = "roots-open-location";

/** Opens the "Where should we deliver?" sheet from anywhere. */
export function openLocationSheet() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenLocationSheet(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** The saved area, read straight from storage (for decisions made right after mount). */
export function storedLocality(): Locality | null {
  return readStored();
}
const CHANGE_EVENT = "roots-locality-change";

function readStored(): Locality | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLocality(value) ? value : null;
  } catch {
    return null;
  }
}

/** The shopper's Bangalore area, remembered on this device and shared by every component using it. */
export function useLocality(): [Locality | null, (next: Locality | null) => void] {
  // Starts empty on the server and first render so hydration matches; filled from storage after mount.
  const [locality, setLocalityState] = useState<Locality | null>(null);

  useEffect(() => {
    setLocalityState(readStored());
    const sync = () => setLocalityState(readStored());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setLocality = useCallback((next: Locality | null) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable: still update this page
    }
    setLocalityState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [locality, setLocality];
}
