import { useCallback, useEffect, useState } from "react";

export const CITY = "Bangalore";

// Launch areas, alphabetical. PIN codes are the main post office for each area.
export const LOCALITIES = [
  { name: "Banashankari", pincode: "560070" },
  { name: "Bellandur", pincode: "560103" },
  { name: "BTM Layout", pincode: "560076" },
  { name: "Electronic City", pincode: "560100" },
  { name: "Hebbal", pincode: "560024" },
  { name: "HSR Layout", pincode: "560102" },
  { name: "Indiranagar", pincode: "560038" },
  { name: "Jayanagar", pincode: "560041" },
  { name: "JP Nagar", pincode: "560078" },
  { name: "Koramangala", pincode: "560034" },
  { name: "Malleshwaram", pincode: "560003" },
  { name: "Marathahalli", pincode: "560037" },
  { name: "Rajajinagar", pincode: "560010" },
  { name: "Sarjapur Road", pincode: "560035" },
  { name: "Whitefield", pincode: "560066" },
  { name: "Yelahanka", pincode: "560064" },
] as const;

export type Locality = (typeof LOCALITIES)[number]["name"];

export const LOCALITY_NAMES = LOCALITIES.map((l) => l.name) as Locality[];

export function isLocality(value: unknown): value is Locality {
  return typeof value === "string" && (LOCALITY_NAMES as string[]).includes(value);
}

export function pincodeFor(locality: Locality | null): string {
  return LOCALITIES.find((l) => l.name === locality)?.pincode ?? "";
}

const STORAGE_KEY = "roots-locality";
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
