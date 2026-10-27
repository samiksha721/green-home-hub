import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fullName, useSessionUser } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { CITY, LOCALITY_NAMES, isLocality, type Locality } from "@/lib/localities";
import {
  CARE_TAGS,
  CATEGORIES,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  GSTIN_RE,
  NAME_MAX,
  PHOTO_MIN_SIDE,
  PRICE_MAX,
  PRICE_MIN,
  STOCK_MAX,
  TAGLINE_MAX,
  nameProblem,
  photoProblem,
  photoSize,
} from "@/lib/vendor-rules";
import { PageShell, SignInPrompt, inputClass } from "@/components/PageShell";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Vendor dashboard — Roots" },
      {
        name: "description",
        content: "Register your nursery and list your plants for homes across Bangalore.",
      },
    ],
  }),
  component: VendorPage,
});

type Vendor = Tables<"vendors">;
type Listing = Tables<"plants">;

const LISTING_STATUS: Record<string, { label: string; style: string }> = {
  pending: { label: "In review", style: "bg-sagelight text-ink/70" },
  approved: { label: "Live", style: "bg-sage/15 text-sage" },
  rejected: { label: "Needs changes", style: "bg-terra/10 text-terra" },
};

function VendorPage() {
  const { user, ready } = useSessionUser();
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined);
  const [listings, setListings] = useState<Listing[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editing, setEditing] = useState<Listing | "new" | null>(null);

  const refresh = useCallback(async (uid: string) => {
    const [v, l] = await Promise.all([
      supabase.from("vendors").select("*").eq("user_id", uid).maybeSingle(),
      supabase
        .from("plants")
        .select("*")
        .eq("vendor_id", uid)
        .order("created_at", { ascending: false }),
    ]);
    setVendor(v.data ?? null);
    setListings(l.data ?? []);
  }, []);

  useEffect(() => {
    if (user) void refresh(user.id);
  }, [user, refresh]);

  if (ready && !user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Sell on Roots</p>
          <h1 className="mt-1 text-balance font-display text-4xl font-semibold tracking-tight">
            Bring your nursery to homes across {CITY}
          </h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-ink/65">
            Register your business, upload your plants with photos and prices, and they'll appear in
            the Roots shop once approved.
          </p>
          <Link
            to="/vendor/guidelines"
            className="mt-4 inline-block text-sm font-medium text-terra hover:text-terra/80"
          >
            Read the vendor guidelines →
          </Link>
        </div>
        <div className="mt-8">
          <SignInPrompt
            title="Sign in to start selling"
            body="Use your existing Roots account or create one — it takes a minute."
            redirect="/vendor"
          />
        </div>
      </PageShell>
    );
  }

  if (!ready || vendor === undefined || !user) {
    return (
      <PageShell>
        <p className="text-sm text-ink/55">Loading…</p>
      </PageShell>
    );
  }

  if (!vendor || editingProfile) {
    return (
      <PageShell>
        <VendorProfileForm
          user={user}
          existing={vendor}
          onSaved={async () => {
            setEditingProfile(false);
            await refresh(user.id);
          }}
          onCancel={vendor ? () => setEditingProfile(false) : undefined}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">
            Vendor dashboard
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            {vendor.business_name}
          </h1>
          <p className="mt-1 text-sm text-ink/55">
            {vendor.locality}, {CITY} · {vendor.contact_name} · {vendor.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/vendor/guidelines"
            className="rounded-full border border-ink/15 bg-surface/50 px-4 py-2 text-sm font-medium transition hover:border-ink/30"
          >
            Guidelines
          </Link>
          <button
            onClick={() => setEditingProfile(true)}
            className="rounded-full border border-ink/15 bg-surface/50 px-4 py-2 text-sm font-medium transition hover:border-ink/30"
          >
            Edit business details
          </button>
        </div>
      </div>

      <VendorStatusBanner vendor={vendor} />

      {editing ? (
        <ListingForm
          userId={user.id}
          existing={editing === "new" ? null : editing}
          onDone={async () => {
            setEditing(null);
            await refresh(user.id);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <section className="mt-6 rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">Your plants</h2>
              <p className="text-sm text-ink/55">
                {listings.filter((l) => l.status === "approved").length} live ·{" "}
                {listings.filter((l) => l.status === "pending").length} in review ·{" "}
                {listings.filter((l) => l.status === "rejected").length} need changes
              </p>
            </div>
            {vendor.status !== "rejected" && (
              <button
                onClick={() => setEditing("new")}
                className="flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
              >
                <Plus className="size-4" /> Add a plant
              </button>
            )}
          </div>

          {listings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink/15 p-8 text-center">
              <p className="font-display text-lg font-semibold">No plants listed yet</p>
              <p className="mx-auto mt-1 max-w-[44ch] text-sm text-ink/55">
                Add your first plant with a clear photo, name, description and price in rupees.
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {listings.map((l) => (
                <li key={l.id} className="flex gap-3 rounded-2xl bg-sagelight/40 p-3">
                  {l.image_url ? (
                    <img
                      src={l.image_url}
                      alt={l.name}
                      className="size-20 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid size-20 shrink-0 place-items-center rounded-xl bg-surface text-xs text-ink/40">
                      No photo
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-display text-base font-semibold">{l.name}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${LISTING_STATUS[l.status]?.style ?? ""}`}
                      >
                        {LISTING_STATUS[l.status]?.label ?? l.status}
                      </span>
                    </div>
                    <p className="text-sm text-ink/60">
                      {formatINR(Number(l.price))} ·{" "}
                      {l.stock > 0 ? `${l.stock} in stock` : "Sold out"} · {l.category}
                    </p>
                    {l.status === "rejected" && l.review_note && (
                      <p className="mt-1 text-xs text-terra">Reviewer: {l.review_note}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setEditing(l)}
                        className="flex items-center gap-1 rounded-full border border-ink/10 bg-surface/60 px-3 py-1 text-xs font-medium transition hover:border-ink/30"
                      >
                        <Pencil className="size-3" /> Edit
                      </button>
                      <DeleteListing listing={l} onDeleted={() => refresh(user.id)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </PageShell>
  );
}

function VendorStatusBanner({ vendor }: { vendor: Vendor }) {
  if (vendor.status === "approved") {
    return (
      <p className="mt-5 rounded-2xl bg-sage/10 px-4 py-3 text-sm text-sage">
        Your business is approved. Live plants appear in the shop as "Sold by {vendor.business_name}
        ".
      </p>
    );
  }
  if (vendor.status === "rejected") {
    return (
      <div className="mt-5 rounded-2xl bg-terra/10 px-4 py-3 text-sm text-terra">
        <p className="font-medium">Your business details need changes before you can sell.</p>
        {vendor.review_note && <p className="mt-0.5">Reviewer: {vendor.review_note}</p>}
        <p className="mt-0.5 text-ink/60">
          Edit your business details to send them for review again.
        </p>
      </div>
    );
  }
  return (
    <p className="mt-5 rounded-2xl bg-sagelight/70 px-4 py-3 text-sm text-ink/70">
      <strong>Your business is being reviewed.</strong> You can add plants now — they'll go live
      once your business and each listing are approved.
    </p>
  );
}

function VendorProfileForm({
  user,
  existing,
  onSaved,
  onCancel,
}: {
  user: User;
  existing: Vendor | null;
  onSaved: () => void | Promise<void>;
  onCancel: (() => void) | undefined;
}) {
  const [businessName, setBusinessName] = useState(existing?.business_name ?? "");
  const [contactName, setContactName] = useState(existing?.contact_name ?? fullName(user));
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? user.email ?? "");
  const [locality, setLocality] = useState<Locality | "">(
    existing && isLocality(existing.locality) ? existing.locality : "",
  );
  const [address, setAddress] = useState(existing?.address ?? "");
  const [gstin, setGstin] = useState(existing?.gstin ?? "");
  const [about, setAbout] = useState(existing?.about ?? "");
  const [agreed, setAgreed] = useState(Boolean(existing));
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const errors = {
    businessName: businessName.trim().length < 2 ? "Enter your business name" : "",
    contactName: contactName.trim().length < 2 ? "Enter a contact person" : "",
    phone: /^[6-9]\d{9}$/.test(digits) ? "" : "Enter a 10-digit mobile number",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Enter a valid email",
    locality: locality ? "" : `Choose your area in ${CITY}`,
    address: address.trim().length < 8 ? "Enter the address where orders are picked up" : "",
    gstin:
      !gstin.trim() || GSTIN_RE.test(gstin.trim().toUpperCase())
        ? ""
        : "That GSTIN doesn't look right (15 characters)",
    agreed: agreed ? "" : "Please confirm you've read the guidelines",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) =>
    submitted && errors[k] ? <p className="mt-1 text-xs text-terra">{errors[k]}</p> : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (hasErrors) return;
    setPending(true);
    const row = {
      user_id: user.id,
      business_name: businessName.trim(),
      contact_name: contactName.trim(),
      phone: digits,
      email: email.trim(),
      locality: locality as string,
      address: address.trim(),
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      about: about.trim(),
    };
    const { error: saveError } = existing
      ? await supabase.from("vendors").update(row).eq("user_id", user.id)
      : await supabase.from("vendors").insert(row);
    setPending(false);
    if (saveError) return setError(saveError.message);
    await onSaved();
  };

  return (
    <form
      onSubmit={save}
      noValidate
      className="mx-auto max-w-2xl rounded-3xl border border-ink/5 bg-surface/70 p-6 shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">
        {existing ? "Business details" : "Become a vendor"}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {existing ? "Edit your business" : "Register your nursery"}
      </h1>
      <p className="mt-1 text-sm text-ink/55">
        We use these details to review your business and to collect orders from you.{" "}
        <Link to="/vendor/guidelines" className="font-medium text-terra hover:text-terra/80">
          Vendor guidelines
        </Link>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Business name</span>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            maxLength={80}
            placeholder="Green Leaf Nursery"
            aria-invalid={submitted && !!errors.businessName}
            className={inputClass}
          />
          {err("businessName")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contact person</span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            autoComplete="name"
            aria-invalid={submitted && !!errors.contactName}
            className={inputClass}
          />
          {err("contactName")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Mobile number</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            maxLength={14}
            aria-invalid={submitted && !!errors.phone}
            className={inputClass}
          />
          {err("phone")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Business email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            aria-invalid={submitted && !!errors.email}
            className={inputClass}
          />
          {err("email")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Area in {CITY}</span>
          <select
            value={locality}
            onChange={(e) => setLocality(isLocality(e.target.value) ? e.target.value : "")}
            aria-invalid={submitted && !!errors.locality}
            className={inputClass}
          >
            <option value="">Choose your area…</option>
            {LOCALITY_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {err("locality")}
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Pickup address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            maxLength={240}
            placeholder="Nursery address where orders will be collected"
            aria-invalid={submitted && !!errors.address}
            className={`${inputClass} resize-none`}
          />
          {err("address")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            GSTIN <span className="font-normal text-ink/45">(if registered)</span>
          </span>
          <input
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, ""))}
            maxLength={15}
            placeholder="29ABCDE1234F1Z5"
            aria-invalid={submitted && !!errors.gstin}
            className={`${inputClass} font-mono uppercase`}
          />
          {err("gstin")}
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">
            About your nursery <span className="font-normal text-ink/45">(optional)</span>
          </span>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="What you grow, how long you've been growing, anything shoppers should know"
            className={`${inputClass} resize-none`}
          />
        </label>
      </div>

      {!existing && (
        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--sage)]"
          />
          <span>
            I've read the{" "}
            <Link
              to="/vendor/guidelines"
              className="font-medium text-terra hover:text-terra/80"
              target="_blank"
            >
              vendor guidelines
            </Link>{" "}
            and my listings will follow them.
          </span>
        </label>
      )}
      {err("agreed")}
      {error && <p className="mt-4 rounded-xl bg-terra/10 px-3 py-2 text-sm text-terra">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Save and send for review" : "Register my nursery"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-ink/15 px-6 py-3 text-sm font-medium transition hover:border-ink/30"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ListingForm({
  userId,
  existing,
  onDone,
  onCancel,
}: {
  userId: string;
  existing: Listing | null;
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [tagline, setTagline] = useState(existing?.tagline ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [tag, setTag] = useState(existing?.tag ?? "");
  const [price, setPrice] = useState(existing ? String(Math.round(Number(existing.price))) : "");
  const [stock, setStock] = useState(existing ? String(existing.stock) : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(existing?.image_url ?? "");
  const [photoError, setPhotoError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const pickPhoto = async (file: File | undefined) => {
    setPhotoError("");
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) return setPhotoError(problem);
    try {
      const { width, height } = await photoSize(file);
      if (Math.min(width, height) < PHOTO_MIN_SIDE) {
        return setPhotoError(
          `This photo is ${width}×${height}px. Use one at least ${PHOTO_MIN_SIDE}×${PHOTO_MIN_SIDE}px so it looks sharp.`,
        );
      }
    } catch (e) {
      return setPhotoError(e instanceof Error ? e.message : "Couldn't read that photo");
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const priceNum = Number(price);
  const stockNum = Number(stock);
  const errors = {
    photo: preview ? "" : "Add a photo of the plant",
    name: nameProblem(name),
    tagline: tagline.trim().length < 5 ? "Add a short tagline" : "",
    description:
      description.trim().length < DESCRIPTION_MIN
        ? `Describe the plant in at least ${DESCRIPTION_MIN} characters (size, pot, care)`
        : "",
    category: category ? "" : "Choose a category",
    price:
      !Number.isInteger(priceNum) || priceNum < PRICE_MIN || priceNum > PRICE_MAX
        ? `Enter a whole rupee price between ${formatINR(PRICE_MIN)} and ${formatINR(PRICE_MAX)}`
        : "",
    stock:
      !Number.isInteger(stockNum) || stockNum < 0 || stockNum > STOCK_MAX || stock === ""
        ? "Enter how many you have (0 if sold out)"
        : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) =>
    submitted && errors[k] ? <p className="mt-1 text-xs text-terra">{errors[k]}</p> : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (hasErrors || photoError) return;
    setPending(true);

    let imageUrl = existing?.image_url ?? null;
    if (photo) {
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("plant-photos")
        .upload(path, photo, { contentType: photo.type, upsert: false });
      if (uploadError) {
        setPending(false);
        return setError(`Photo upload failed: ${uploadError.message}`);
      }
      imageUrl = supabase.storage.from("plant-photos").getPublicUrl(path).data.publicUrl;
    }

    const row = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      category,
      tag,
      price: priceNum,
      stock: stockNum,
      image_url: imageUrl,
      vendor_id: userId,
    };
    const { error: saveError } = existing
      ? await supabase.from("plants").update(row).eq("id", existing.id)
      : await supabase.from("plants").insert(row);
    setPending(false);
    if (saveError) {
      return setError(
        saveError.code === "23505"
          ? "You already have a plant with this name. Edit that listing instead, or add the variety to the name."
          : saveError.message,
      );
    }
    await onDone();
  };

  return (
    <form
      onSubmit={save}
      noValidate
      className="mt-6 rounded-3xl border border-ink/5 bg-surface/70 p-6 shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">
          {existing ? `Edit ${existing.name}` : "Add a plant"}
        </h2>
        <Link
          to="/vendor/guidelines"
          className="text-sm font-medium text-terra hover:text-terra/80"
          target="_blank"
        >
          Listing guidelines ↗
        </Link>
      </div>
      {existing?.status === "approved" && (
        <p className="mt-2 text-sm text-ink/55">
          Saving changes sends this plant back for a quick review before it shows again.
        </p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
        <div>
          <span className="text-sm font-medium">Photo</span>
          <label className="mt-1.5 flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-sagelight/40 text-center transition hover:border-ink/40">
            {preview ? (
              <img src={preview} alt="Plant preview" className="size-full object-cover" />
            ) : (
              <>
                <ImagePlus className="size-6 text-ink/45" />
                <span className="px-4 text-sm font-medium">Choose a photo</span>
                <span className="px-4 text-xs text-ink/50">
                  Square, daylight, plain background · JPG/PNG/WebP up to 5 MB
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
          </label>
          {preview && <p className="mt-1.5 text-xs text-ink/50">Click the photo to replace it.</p>}
          {photoError && <p className="mt-1 text-xs text-terra">{photoError}</p>}
          {!photoError && err("photo")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Plant name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="Snake Plant (Sansevieria trifasciata)"
              aria-invalid={submitted && !!errors.name}
              className={inputClass}
            />
            {err("name")}
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Tagline</span>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              placeholder="Thrives on neglect and low light"
              aria-invalid={submitted && !!errors.tagline}
              className={inputClass}
            />
            {err("tagline")}
          </label>
          <label className="block sm:col-span-2">
            <span className="flex justify-between text-sm font-medium">
              Description
              <span className="font-normal text-ink/45">
                {description.trim().length}/{DESCRIPTION_MAX}
              </span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={4}
              placeholder="Height with pot, pot size and material, light and watering, pet safety, and exactly what's included."
              aria-invalid={submitted && !!errors.description}
              className={`${inputClass} resize-none`}
            />
            {err("description")}
          </label>
          <label className="block">
            <span className="text-sm font-medium">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-invalid={submitted && !!errors.category}
              className={inputClass}
            >
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
            {category && (
              <p className="mt-1 text-xs text-ink/45">
                {CATEGORIES.find((c) => c.id === category)?.hint}
              </p>
            )}
            {err("category")}
          </label>
          <label className="block">
            <span className="text-sm font-medium">
              Care tag <span className="font-normal text-ink/45">(optional)</span>
            </span>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {CARE_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Price (₹)</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-ink/50">
                ₹
              </span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="449"
                aria-invalid={submitted && !!errors.price}
                className={`${inputClass} pl-7`}
              />
            </div>
            <p className="mt-1 text-xs text-ink/45">
              Final price incl. pot; delivery is added by Roots.
            </p>
            {err("price")}
          </label>
          <label className="block">
            <span className="text-sm font-medium">Stock</span>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="15"
              aria-invalid={submitted && !!errors.stock}
              className={inputClass}
            />
            {err("stock")}
          </label>
        </div>
      </div>

      {error && <p className="mt-5 rounded-xl bg-terra/10 px-3 py-2 text-sm text-terra">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Save and send for review" : "Submit for review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-ink/15 px-6 py-3 text-sm font-medium transition hover:border-ink/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteListing({ listing, onDeleted }: { listing: Listing; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-ink/55 transition hover:text-terra"
      >
        <Trash2 className="size-3" /> Remove
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs">
      Remove {listing.name}?
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await supabase.from("plants").delete().eq("id", listing.id);
          setBusy(false);
          onDeleted();
        }}
        className="rounded-full bg-terra px-2.5 py-1 font-medium text-cream disabled:opacity-50"
      >
        Yes, remove
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-full px-2 py-1 text-ink/55 hover:text-ink"
      >
        Keep
      </button>
    </span>
  );
}
