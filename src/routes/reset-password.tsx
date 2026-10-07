import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Cormorant" },
      { name: "description", content: "Choose a new password for your Cormorant account." },
      { property: "og:title", content: "Reset password — Cormorant" },
      { property: "og:description", content: "Choose a new password for your Cormorant account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters");
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) return setError(error.message);
    navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <div className="animate-drift pointer-events-none absolute -left-32 -top-40 size-[560px] rounded-full bg-sage/25 blur-3xl dark:opacity-50" />
      <header className="relative z-20 border-b border-ink/5 bg-cream/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-sage/15 font-display text-lg font-semibold text-sage">
              C
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">Cormorant</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="relative z-10 mx-auto flex max-w-md px-6 py-16">
        <form
          onSubmit={onSubmit}
          noValidate
          className="animate-rise w-full rounded-3xl border border-ink/5 bg-surface/70 p-6 shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl sm:p-8"
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-ink/55">Choose something you'll remember.</p>
          <label htmlFor="password" className="mt-6 block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20"
          />
          {error && <p className="mt-2 text-xs text-terra">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "One moment…" : "Update password"}
          </button>
        </form>
      </main>
    </div>
  );
}
