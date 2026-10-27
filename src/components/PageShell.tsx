import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/** Background, header and footer shared by the inner pages (checkout, orders, vendor). */
export function PageShell({
  children,
  showBag = true,
}: {
  children: ReactNode;
  showBag?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-clip bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <div className="animate-drift pointer-events-none absolute -left-32 -top-40 size-[560px] rounded-full bg-sage/20 blur-3xl dark:opacity-50" />
      <div className="animate-drift-reverse pointer-events-none absolute right-[-160px] top-1/3 size-[520px] rounded-full bg-terra/10 blur-3xl dark:opacity-50" />
      <SiteHeader showBag={showBag} />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function SignInPrompt({
  title,
  body,
  redirect,
}: {
  title: string;
  body: string;
  redirect: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-ink/5 bg-surface/70 p-8 text-center shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">{body}</p>
      <a
        href={`/login?redirect=${encodeURIComponent(redirect)}`}
        className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
      >
        Sign in or create an account
      </a>
    </div>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20 aria-[invalid=true]:border-terra";
