import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const OPEN_EVENT = "roots-open-signin";
const RETURN_KEY = "roots-after-signin";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_AFTER_S = 30;

/** Opens the sign-in sheet over the current page; `reason` finishes "Log in or sign up …". */
export function openSignIn(reason = "") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: reason }));
}

/**
 * Quick sign-in, quick-commerce style: Google in one tap, or an emailed code. The same steps sign
 * new shoppers up, and the shopper stays on the page they were on.
 */
export function AuthSheet() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"start" | "code">("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setReason((e as CustomEvent<string>).detail ?? "");
      setStep("start");
      setCode("");
      setError("");
      setOpen(true);
      try {
        setEmail((current) => current || localStorage.getItem("last-email")?.trim() || "");
      } catch {
        // storage unavailable
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Close as soon as a session appears (code verified, or the email link opened in this browser),
  // and finish a Google sign-in by returning to the page that started it.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event !== "SIGNED_IN") return;
      setOpen(false);
      let back: string | null = null;
      try {
        back = sessionStorage.getItem(RETURN_KEY);
        sessionStorage.removeItem(RETURN_KEY);
      } catch {
        // storage unavailable
      }
      if (back && back !== window.location.pathname + window.location.search)
        navigate({ to: back });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!open) return;
    (step === "code" ? codeInput : emailInput).current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const here = () => window.location.pathname + window.location.search;

  const google = async () => {
    setError("");
    setPending(true);
    try {
      sessionStorage.setItem(RETURN_KEY, here());
    } catch {
      // storage unavailable: Google returns to the home page
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    setPending(false);
    if (result.error) {
      setError(
        result.error instanceof Error
          ? result.error.message
          : "Google sign-in didn't go through. Please try again.",
      );
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address");
    setPending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + here() },
    });
    setPending(false);
    if (otpError) return setError(otpError.message);
    try {
      localStorage.setItem("last-email", email.trim());
    } catch {
      // storage unavailable
    }
    setStep("code");
    setCode("");
    setResendIn(RESEND_AFTER_S);
  };

  const verify = async (e?: FormEvent) => {
    const value = code;
    e?.preventDefault();
    setError("");
    if (!/^\d{6,8}$/.test(value)) return setError("Enter the code from the email");
    setPending(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: value,
      type: "email",
    });
    setPending(false);
    if (verifyError) {
      setError(
        /expired|invalid/i.test(verifyError.message)
          ? "That code is wrong or has expired. Check the email or send a new code."
          : verifyError.message,
      );
    }
  };

  // Codes are 6 digits by default (projects can set up to 8), so the shopper presses Continue.
  const typeCode = (value: string) => setCode(value.replace(/\D/g, "").slice(0, 8));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm dark:bg-black/60"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className="animate-rise relative w-full max-w-md rounded-t-3xl border border-ink/5 bg-cream p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {step === "code" && (
              <button
                onClick={() => setStep("start")}
                className="-ml-1 mt-1 grid size-7 place-items-center rounded-full text-ink/55 hover:text-ink"
                aria-label="Use a different email"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div>
              <h2 id="signin-title" className="font-display text-2xl font-semibold tracking-tight">
                {step === "start" ? "Log in or sign up" : "Check your email"}
              </h2>
              <p className="mt-1 text-sm text-ink/60">
                {step === "start"
                  ? reason || "One step — no password needed."
                  : `We sent a sign-in code to ${email.trim()}. You can also tap the link in that email.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-ink/10 bg-surface/60 transition hover:border-ink/30"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {step === "start" ? (
          <>
            <button
              type="button"
              onClick={google}
              disabled={pending}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-ink/10 bg-surface/70 px-5 py-3 text-sm font-medium transition hover:border-ink/30 disabled:opacity-60"
            >
              <GoogleG /> Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-ink/40">
              <span className="h-px flex-1 bg-ink/10" /> or use your email{" "}
              <span className="h-px flex-1 bg-ink/10" />
            </div>
            <form onSubmit={sendCode} noValidate>
              <input
                ref={emailInput}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-label="Email"
                className="w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20"
              />
              <button
                type="submit"
                disabled={pending}
                className="mt-3 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send me a code"}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={verify} noValidate className="mt-5">
            <input
              ref={codeInput}
              value={code}
              onChange={(e) => typeCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              aria-label="Sign-in code"
              className="w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none transition placeholder:text-ink/25 focus:border-sage focus:ring-2 focus:ring-sage/20"
            />
            <button
              type="submit"
              disabled={pending}
              className="mt-3 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60"
            >
              {pending ? "Checking…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={resendIn > 0 || pending}
              className="mt-3 w-full text-center text-sm text-ink/55 hover:text-ink disabled:hover:text-ink/55"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-terra">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-xs text-ink/50">
          Prefer a password or username?{" "}
          <a
            href={`/login?redirect=${encodeURIComponent(typeof window === "undefined" ? "/" : here())}`}
            className="font-medium text-terra hover:text-terra/80"
          >
            Use password sign-in
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.86c2.26-2.09 3.57-5.17 3.57-8.89Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a11.99 11.99 0 0 0 0 10.72l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.64l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
