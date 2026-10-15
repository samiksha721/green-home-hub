import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Upload, Download, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminStatus, claimShopOwnership, importPlants, type ImportRow } from "@/lib/inventory.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Cormorant — Inventory" },
      {
        name: "description",
        content: "Import and manage the plant inventory for the Cormorant greenhouse.",
      },
      { property: "og:title", content: "Cormorant — Inventory" },
      {
        property: "og:description",
        content: "Import and manage the plant inventory for the Cormorant greenhouse.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

const CATEGORIES = ["Foliage", "Flowering", "Terrace"] as const;

interface Row {
  name: string;
  tagline: string;
  price: number;
  tag: string;
  category: string;
  stock: number;
  image_url: string;
}

interface InventoryRow {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("The CSV needs a header row and at least one plant row.");

  const cells: string[][] = lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });

  const header = cells[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const required = ["name", "price", "category", "stock"];
  for (const col of required) {
    if (!header.includes(col)) throw new Error(`Missing required column: ${col}`);
  }
  const idx = (col: string) => header.indexOf(col);

  return cells.slice(1).map((row) => ({
    name: row[idx("name")] ?? "",
    tagline: row[idx("tagline")] ?? "",
    price: Number(row[idx("price")]),
    tag: row[idx("tag")] ?? "",
    category: row[idx("category")] ?? "",
    stock: Number(row[idx("stock")]),
    image_url: row[idx("image_url")] ?? "",
  }));
}

function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [status, setStatus] = useState<{ isAdmin: boolean; adminExists: boolean } | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshInventory = useCallback(async () => {
    const { data } = await supabase
      .from("plants")
      .select("id, name, category, price, stock")
      .order("name");
    setInventory(
      (data ?? []).map((r) => ({ id: r.id, name: r.name, category: r.category, price: Number(r.price), stock: r.stock })),
    );
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setCheckedAuth(true);
      if (u) {
        const res = await adminStatus();
        setStatus(res);
        await refreshInventory();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshInventory]);

  const downloadTemplate = () => {
    const csv = [
      "name,tagline,price,tag,category,stock,image_url",
      'Snake Plant,"Upright, architectural",55,Low light,Foliage,10,https://…',
      'Peace Lily,"Flowering classic",48,Shade loving,Flowering,7,',
      'Olive Tree,"Mediterranean patio tree",180,Drought hardy,Terrace,3,https://…',
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cormorant-plant-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined) => {
    setMessage(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed);
    } catch (e) {
      setRows(null);
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Could not read that file." });
    }
  };

  const runImport = async () => {
    if (!rows?.length) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await importPlants({ data: { rows } });
      setMessage({ kind: "ok", text: `Imported ${res.imported} plant${res.imported === 1 ? "" : "s"}.` });
      setRows(null);
      setFileName("");
      await refreshInventory();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Import failed." });
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await claimShopOwnership();
      if (res.status === "claimed" || res.status === "admin") {
        setStatus({ isAdmin: true, adminExists: true });
        setMessage({ kind: "ok", text: "You're now the shop admin." });
        await refreshInventory();
      } else {
        setMessage({ kind: "err", text: "The shop already has an owner." });
      }
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <header className="border-b border-ink/5 bg-cream/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-sage/15 font-display text-lg font-semibold text-sage">
              C
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">Cormorant</span>
            <span className="mt-1 font-display text-xs italic text-ink/45">inventory</span>
          </Link>
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full px-3 py-1.5 text-sm text-ink/60 transition hover:text-ink"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-full px-3 py-1.5 text-sm text-ink/60 transition hover:text-ink"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        {!checkedAuth ? (
          <p className="text-sm text-ink/55">Loading…</p>
        ) : !user ? (
          <div className="rounded-3xl border border-ink/5 bg-surface/60 p-8 text-center backdrop-blur-xl">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Inventory is staff-only</h1>
            <p className="mx-auto mt-2 max-w-[44ch] text-sm text-ink/60">
              Sign in with the shop's admin account to import plants and manage stock.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
            >
              Sign in
            </Link>
          </div>
        ) : status && !status.isAdmin ? (
          <div className="rounded-3xl border border-ink/5 bg-surface/60 p-8 text-center backdrop-blur-xl">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {status.adminExists ? "Admins only" : "Set up your greenhouse"}
            </h1>
            <p className="mx-auto mt-2 max-w-[48ch] text-sm text-ink/60">
              {status.adminExists
                ? "This account doesn't have inventory access. Ask the shop owner to grant it."
                : "You're the first account here. Claim the shop to become its admin, then import your plant list."}
            </p>
            {!status.adminExists && (
              <button
                onClick={claim}
                disabled={busy}
                className="mt-5 rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50"
              >
                Claim the shop
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Supplier list</p>
                  <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Import plants</h1>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-surface/60 px-3.5 py-2 text-sm font-medium transition hover:border-ink/30"
                >
                  <Download className="size-4" />
                  CSV template
                </button>
              </div>
              <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ink/60">
                Upload your nursery's price list as a CSV. Columns: <code className="font-mono text-xs">name,
                tagline, price, tag, category, stock, image_url</code>. Re-importing a name updates its price and
                stock instead of duplicating it.
              </p>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 bg-sagelight/40 px-6 py-8 text-center transition hover:border-ink/40">
                <Upload className="size-5 text-ink/50" />
                <span className="text-sm font-medium">{fileName || "Choose a CSV file"}</span>
                <span className="text-xs text-ink/50">{rows ? `${rows.length} plants ready to import` : "or drop it here"}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>

              {rows && rows.length > 0 && (
                <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-ink/5">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-sagelight/60 text-xs uppercase tracking-wider text-ink/50">
                      <tr>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Category</th>
                        <th className="px-4 py-2 font-medium">Price</th>
                        <th className="px-4 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-ink/5">
                          <td className="px-4 py-2">{r.name || <span className="text-terra">missing</span>}</td>
                          <td className="px-4 py-2 text-ink/60">{r.category || <span className="text-terra">missing</span>}</td>
                          <td className="px-4 py-2">${Number.isFinite(r.price) ? r.price : <span className="text-terra">?</span>}</td>
                          <td className="px-4 py-2 text-ink/60">{Number.isFinite(r.stock) ? r.stock : <span className="text-terra">?</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={runImport}
                disabled={!rows || busy}
                className="mt-4 flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-40"
              >
                {busy ? <span className="animate-pulse">Importing…</span> : <Check className="size-4" />}
                {busy ? "Importing" : `Import ${rows?.length ?? 0} plants`}
              </button>

              {message && (
                <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-sage" : "text-terra"}`}>{message.text}</p>
              )}
            </section>

            <section className="rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Current stock</p>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                {inventory.length} plant{inventory.length === 1 ? "" : "s"} in the greenhouse
              </h2>
              <div className="mt-4 grid gap-2">
                {inventory.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl bg-sagelight/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-display text-base font-semibold leading-tight">{p.name}</p>
                      <p className="text-sm text-ink/55">{p.category}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-display font-semibold">${p.price}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          p.stock > 0 ? "bg-sage/10 text-sage" : "bg-terra/10 text-terra"
                        }`}
                      >
                        {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
