import meera from "@/assets/pros/mara.jpg";
import arjun from "@/assets/pros/devin.jpg";
import priya from "@/assets/pros/priya.jpg";
import type { Locality } from "@/lib/localities";

export interface Pro {
  id: string;
  name: string;
  role: string;
  blurb: string;
  /** Hourly rate in rupees. */
  rate: number;
  rating: number;
  reviews: number;
  next: string;
  /** Portrait, or null to show initials. */
  image: string | null;
  services: string[];
  /** Bangalore areas this professional travels to. */
  areas: Locality[];
}

export const PROS: Pro[] = [
  {
    id: "meera",
    name: "Meera Krishnan",
    role: "Gardener & plant doctor",
    blurb: "Pruning, repotting, and pest diagnosis for indoor, balcony, and patio collections.",
    rate: 600,
    rating: 4.9,
    reviews: 212,
    next: "Thu",
    image: meera,
    services: ["Pruning & repotting visit", "Plant health diagnosis", "Seasonal care plan"],
    areas: ["Indiranagar", "Koramangala", "HSR Layout", "BTM Layout", "Jayanagar", "Bellandur"],
  },
  {
    id: "arjun",
    name: "Arjun Hegde",
    role: "Landscape engineer",
    blurb:
      "Design, grading, drainage, and installation for terraces, villas, and full garden schemes.",
    rate: 1800,
    rating: 5.0,
    reviews: 148,
    next: "Mon",
    image: arjun,
    services: ["Site consultation", "Terrace design & grading", "Full landscape install"],
    areas: [
      "Whitefield",
      "Marathahalli",
      "Sarjapur Road",
      "Bellandur",
      "Electronic City",
      "HSR Layout",
    ],
  },
  {
    id: "priya",
    name: "Priya Shetty",
    role: "Exterior home pro",
    blurb: "Pergolas, patios, and softscape around the outside of your home.",
    rate: 1200,
    rating: 4.8,
    reviews: 176,
    next: "Fri",
    image: priya,
    services: ["Patio & pergola work", "Exterior softscape", "Facade refresh consult"],
    areas: ["Malleshwaram", "Rajajinagar", "Hebbal", "Yelahanka", "Indiranagar"],
  },
  {
    id: "ravi",
    name: "Ravi Gowda",
    role: "Terrace & balcony gardener",
    blurb: "Container kitchen gardens, drip watering, and sun-tough plants for Bangalore terraces.",
    rate: 500,
    rating: 4.7,
    reviews: 94,
    next: "Wed",
    image: null,
    services: ["Kitchen garden setup", "Drip irrigation install", "Monthly terrace upkeep"],
    areas: ["Jayanagar", "JP Nagar", "Banashankari", "BTM Layout", "Electronic City"],
  },
  {
    id: "kavya",
    name: "Kavya Iyer",
    role: "Vertical garden designer",
    blurb: "Living walls and planter screens for apartments, offices, and compact spaces.",
    rate: 1500,
    rating: 4.9,
    reviews: 67,
    next: "Sat",
    image: null,
    services: ["Living wall design", "Planter screen install", "Indoor greening consult"],
    areas: ["Koramangala", "Indiranagar", "Whitefield", "Hebbal", "Marathahalli"],
  },
  {
    id: "suresh",
    name: "Suresh Reddy",
    role: "Lawn & irrigation specialist",
    blurb: "New lawns, sprinkler and drip systems, and rainwater-friendly watering plans.",
    rate: 900,
    rating: 4.8,
    reviews: 121,
    next: "Tue",
    image: null,
    services: ["Lawn laying & repair", "Sprinkler system install", "Watering plan visit"],
    areas: ["Yelahanka", "Hebbal", "Sarjapur Road", "Whitefield", "Banashankari", "JP Nagar"],
  },
];

export function prosServing(locality: Locality | null): Pro[] {
  return locality ? PROS.filter((p) => p.areas.includes(locality)) : PROS;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** The next four days, e.g. "Mon 26", starting tomorrow. */
export function upcomingDays(from: Date = new Date()): string[] {
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i + 1);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
  });
}

export const TIMES = ["9:00 AM", "9:30 AM", "11:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"];
