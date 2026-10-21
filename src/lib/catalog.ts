import mara from "@/assets/pros/mara.jpg";
import devin from "@/assets/pros/devin.jpg";
import priya from "@/assets/pros/priya.jpg";

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
