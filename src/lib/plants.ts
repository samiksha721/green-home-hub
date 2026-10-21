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
