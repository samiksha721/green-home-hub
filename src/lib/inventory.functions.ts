import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Plant, PlantCategory } from "@/lib/plants";
import { createPublishableClient } from "@/lib/supabase-public";

export const listPlants = createServerFn({ method: "GET" }).handler(async (): Promise<Plant[]> => {
  const supabasePublic = createPublishableClient();
  const { data, error } = await supabasePublic
    .from("plants")
    .select("id, name, tagline, price, tag, category, stock, image_url, description, vendor_name, service_areas")
    .eq("active", true)
    .eq("status", "approved")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? "",
    price: Number(row.price),
    tag: row.tag ?? "",
    category: (row.category ?? "Foliage") as PlantCategory,
    stock: row.stock ?? 0,
    image: row.image_url,
    description: row.description ?? "",
    vendorName: row.vendor_name,
    serviceAreas: row.service_areas,
  }));
});

export const adminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const { data: adminExists } = await supabase.rpc("has_any_admin");
    return { isAdmin: Boolean(isAdmin), adminExists: Boolean(adminExists) };
  });

export const claimShopOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin) return { status: "admin" as const };
    const { data: adminExists } = await supabase.rpc("has_any_admin");
    if (adminExists) return { status: "taken" as const };

    // Bootstrap only: when the shop has no owner yet, the first account claims it.
    // Privileged write happens only after that check, via the admin client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { status: "claimed" as const };
  });

export interface ImportRow {
  name: string;
  tagline: string;
  price: number;
  tag: string;
  category: string;
  stock: number;
  image_url: string;
}

export const importPlants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: ImportRow[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only the shop admin can import plants");

    const categories = new Set(["Foliage", "Flowering", "Terrace"]);
    for (const [i, row] of data.rows.entries()) {
      if (!row.name?.trim()) throw new Error(`Row ${i + 1}: name is required`);
      if (!Number.isFinite(row.price) || row.price < 0)
        throw new Error(`Row ${i + 1} (${row.name}): price must be a positive number`);
      if (!categories.has(row.category))
        throw new Error(
          `Row ${i + 1} (${row.name}): category must be Foliage, Flowering, or Terrace`,
        );
      if (!Number.isFinite(row.stock) || row.stock < 0)
        throw new Error(`Row ${i + 1} (${row.name}): stock must be a whole number`);
    }

    const { error } = await supabase.from("plants").upsert(
      data.rows.map((row) => ({
        name: row.name.trim(),
        tagline: row.tagline ?? "",
        price: row.price,
        tag: row.tag ?? "",
        category: row.category,
        stock: Math.round(row.stock),
        image_url: row.image_url?.trim() || null,
        active: true,
        // Roots' own stock: unique by name among the shop's plants (vendor listings are separate).
        vendor_id: null,
        status: "approved",
      })),
      { onConflict: "name,vendor_id" },
    );
    if (error) throw new Error(error.message);
    return { imported: data.rows.length };
  });
