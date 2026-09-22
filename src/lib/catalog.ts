import monstera from "@/assets/plants/monstera.jpg";
import fiddleLeafFig from "@/assets/plants/fiddle-leaf-fig.jpg";
import stringOfPearls from "@/assets/plants/string-of-pearls.jpg";
import rubberTree from "@/assets/plants/rubber-tree.jpg";
import mara from "@/assets/pros/mara.jpg";
import devin from "@/assets/pros/devin.jpg";
import priya from "@/assets/pros/priya.jpg";

export type PlantCategory = "Foliage" | "Flowering" | "Terrace";

export interface Plant {
  id: string;
  name: string;
  tagline: string;
  price: number;
  tag: string;
  category: PlantCategory;
  image: string;
}

export interface Pro {
  id: string;
  name: string;
  role: string;
  blurb: string;
  rate: number;
  rating: number;
  reviews: number;
  next: string;
  image: string;
  services: string[];
}

export const PLANTS: Plant[] = [
  {
    id: "monstera",
    name: "Monstera Deliciosa",
    tagline: "The split-leaf classic",
    price: 68,
    tag: "Low light",
    category: "Foliage",
    image: monstera,
  },
  {
    id: "fiddle",
    name: "Fiddle Leaf Fig",
    tagline: "Sculptural, statement",
    price: 120,
    tag: "Bright light",
    category: "Foliage",
    image: fiddleLeafFig,
  },
  {
    id: "pearls",
    name: "String of Pearls",
    tagline: "Cascading succulent",
    price: 42,
    tag: "Trailing",
    category: "Terrace",
    image: stringOfPearls,
  },
  {
    id: "rubber",
    name: "Rubber Tree",
    tagline: "Broad, glossy leaves",
    price: 95,
    tag: "Pet safe",
    category: "Foliage",
    image: rubberTree,
  },
];

export const PROS: Pro[] = [
  {
    id: "mara",
    name: "Mara Ellison",
    role: "Gardener & plant physician",
    blurb: "Pruning, repotting, and diagnosis for indoor & patio collections.",
    rate: 65,
    rating: 4.9,
    reviews: 212,
    next: "Thu",
    image: mara,
    services: ["Pruning & repotting visit", "Plant health diagnosis", "Seasonal care plan"],
  },
  {
    id: "devin",
    name: "Devin Okafor",
    role: "Landscape engineer",
    blurb: "Design, grading, and install for terraces and full outdoor schemes.",
    rate: 140,
    rating: 5.0,
    reviews: 148,
    next: "Mon",
    image: devin,
    services: ["Site consultation", "Terrace design & grading", "Full landscape install"],
  },
  {
    id: "priya",
    name: "Priya Nair",
    role: "Exterior home pro",
    blurb: "Pergolas, patios, and softscape around the exterior of your home.",
    rate: 95,
    rating: 4.8,
    reviews: 176,
    next: "Fri",
    image: priya,
    services: ["Patio & pergola work", "Exterior softscape", "Facade refresh consult"],
  },
];

export const DAYS = ["Thu 18", "Fri 19", "Sat 20", "Sun 21"];
export const TIMES = ["9:00 AM", "9:30 AM", "11:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"];
