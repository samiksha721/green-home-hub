import { queryOptions } from "@tanstack/react-query";
import monstera from "@/assets/plants/monstera.jpg";
import fiddleLeafFig from "@/assets/plants/fiddle-leaf-fig.jpg";
import stringOfPearls from "@/assets/plants/string-of-pearls.jpg";
import rubberTree from "@/assets/plants/rubber-tree.jpg";
import { listPlants } from "@/lib/inventory.functions";

export type PlantCategory = "Foliage" | "Flowering" | "Terrace";

export interface Plant {
  id: string;
  name: string;
  tagline: string;
  price: number;
  tag: string;
  category: PlantCategory;
  stock: number;
  image: string | null;
  description: string;
  /** Set for listings from marketplace vendors; null for Roots' own stock. */
  vendorName: string | null;
  /** Areas this plant is delivered to; null means every launch area (Roots' own greenhouse). */
  serviceAreas: string[] | null;
}

/** Whether a plant can be delivered to the shopper's area (any area counts until one is chosen). */
export function deliversTo(
  plant: { serviceAreas: string[] | null },
  locality: string | null,
): boolean {
  return !locality || !plant.serviceAreas || plant.serviceAreas.includes(locality);
}

// Bundled photos for the founding plants; imported rows use their own image_url.
const FALLBACK_IMAGES: Record<string, string> = {
  "Monstera Deliciosa": monstera,
  "Fiddle Leaf Fig": fiddleLeafFig,
  "String of Pearls": stringOfPearls,
  "Rubber Tree": rubberTree,
};

export function plantImage(plant: { name: string; image: string | null }): string {
  return plant.image ?? FALLBACK_IMAGES[plant.name] ?? "";
}

export const plantsQuery = queryOptions({
  queryKey: ["plants"],
  queryFn: async (): Promise<Plant[]> => listPlants(),
});
