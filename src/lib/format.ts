const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹1,299 — whole rupees, Indian digit grouping. */
export function formatINR(amount: number): string {
  return inr.format(Math.round(amount));
}

/** Free delivery from this subtotal; below it a flat fee applies (mirrors place_order in the database). */
export const FREE_DELIVERY_FROM = 999;
export const DELIVERY_FEE = 99;

export function deliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
}
