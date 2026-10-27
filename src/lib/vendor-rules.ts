// Listing rules shared by the vendor form and the guidelines page, so the two never disagree.

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIN_SIDE = 800;
export const PHOTO_RECOMMENDED_SIDE = 1200;

export const NAME_MAX = 60;
export const TAGLINE_MAX = 60;
export const DESCRIPTION_MIN = 40;
export const DESCRIPTION_MAX = 600;
export const PRICE_MIN = 49;
export const PRICE_MAX = 50000;
export const STOCK_MAX = 999;

export const CATEGORIES = [
  { id: "Foliage", hint: "Indoor leafy plants: monstera, snake plant, pothos, ferns, palms" },
  { id: "Flowering", hint: "Plants grown for blooms: hibiscus, jasmine, anthurium, orchids" },
  { id: "Terrace", hint: "Outdoor, balcony and sun-loving plants, succulents and cacti" },
] as const;

export const CARE_TAGS = [
  "Low light",
  "Bright light",
  "Full sun",
  "Pet safe",
  "Air purifying",
  "Low water",
  "Trailing",
  "Flowering",
] as const;

// GSTIN: 2-digit state code, PAN (5 letters, 4 digits, 1 letter), entity number, Z, checksum.
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Promotional words that don't belong in a plant's name. */
const PROMO_WORDS = /\b(best|sale|offer|discount|cheap|free|guaranteed|no\.?\s*1)\b/i;

export function nameProblem(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 3) return "Enter the plant's name";
  if (trimmed.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters`;
  if (trimmed === trimmed.toUpperCase() && /[A-Z]{4}/.test(trimmed)) return "Avoid ALL CAPS";
  if (PROMO_WORDS.test(trimmed)) return "Leave offers and claims out of the name";
  if (/\p{Extended_Pictographic}/u.test(trimmed)) return "Leave emoji out of the name";
  return "";
}

export function photoProblem(file: File): string {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type))
    return "Use a JPG, PNG or WebP photo";
  if (file.size > PHOTO_MAX_BYTES) return "Photos must be 5 MB or smaller";
  return "";
}

/** Reads a photo's pixel size in the browser. */
export function photoSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("That file doesn't look like a photo"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
