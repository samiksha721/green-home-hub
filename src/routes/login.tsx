import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } =>
    search["mode"] === "signup" ? { mode: "signup" } : {},
  head: () => ({
    meta: [
      { title: "Sign in — Cormorant" },
      {
        name: "description",
        content: "Sign in to your Cormorant account to manage orders and garden appointments.",
      },
    ],
  }),
  component: Login,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const mode: Mode = search.mode ?? "signin";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const errors = {
    name: mode === "signup" && !name.trim() ? "Tell us your name" : "",
    email: !email.trim() ? "Email is required" : !EMAIL_RE.test(email) ? "Enter a valid email" : "",
    password: !password
      ? "Password is required"
      : mode === "signup" && password.length < 8
        ? "Use at least 8 characters"
        : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const switchMode = (next: Mode) => {
    setSubmitted(false);
    navigate({ search: next === "signup" ? { mode: "signup" } : {}, replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", search: {} as never, replace: true });
    });
  }, [navigate]);

  const onForgot = async () => {
    setAuthError("");
    setNotice("");
    if (!email.trim() || !EMAIL_RE.test(email)) {
      setAuthError("Enter your email above first, then tap Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) setAuthError(error.message);
    else setNotice("If an account exists for that email, a reset link is on its way.");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setAuthError("");
    setNotice("");
    if (hasErrors) return;
    setPending(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);
      if (error) return setAuthError(error.message);
      navigate({ to: "/", search: {} as never });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
      });
      setPending(false);
      if (error) return setAuthError(error.message);
      if (data.session) navigate({ to: "/", search: {} as never });
      else setDone(true);
    }
  };

  const fieldClass = (error: string) =>
    `mt-1.5 w-full rounded-xl border bg-surface/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:ring-2 ${
      submitted && error
        ? "border-terra focus:border-terra focus:ring-terra/20"
        : "border-ink/10 focus:border-sage focus:ring-sage/20"
    }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <div className="animate-drift pointer-events-none absolute -left-32 -top-40 size-[560px] rounded-full bg-sage/25 blur-3xl dark:opacity-50" />
      <div className="animate-drift-reverse pointer-events-none absolute right-[-160px] top-1/3 size-[520px] rounded-full bg-terra/15 blur-3xl dark:opacity-50" />

      <header className="relative z-20 border-b border-ink/5 bg-cream/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-sage/15 font-display text-lg font-semibold text-sage">
              C
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">Cormorant</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="rounded-full px-3 py-1.5 text-sm text-ink/60 transition hover:text-ink"
            >
              Back to shop
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 lg:min-h-[calc(100vh-73px)] lg:grid-cols-[1fr_440px] lg:py-0">
        <section className="animate-rise hidden lg:block">
          <p className="mb-4 font-display text-sm italic text-sage">Your greenhouse, remembered</p>
          <h1 className="max-w-[14ch] text-balance font-display text-6xl font-semibold leading-[0.95] tracking-tight">
            Welcome back to the <span className="italic text-sage">garden</span>.
          </h1>
          <ul className="mt-8 space-y-3 text-ink/65">
            {[
              "Track plant orders and deliveries",
              "Rebook your favorite gardener in a tap",
              "Get care reminders for every plant you own",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-sage/15 text-sage">
                  <Check className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="animate-rise w-full rounded-3xl border border-ink/5 bg-surface/70 p-6 shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-sage/15 text-sage">
                <Check className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
                {mode === "signup" ? "Account created" : "You're signed in"}
              </h2>
              <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-ink/60">
                {mode === "signup"
                  ? `Welcome to Cormorant, ${name.trim()}.`
                  : `Signed in as ${email}.`}
              </p>
              <Link
                to="/"
                className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
              >
                Continue to the shop
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-full border border-ink/5 bg-surface/50 p-1">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`rounded-full py-1.5 text-sm font-medium transition ${
                      mode === m
                        ? "bg-surface text-ink shadow-sm ring-1 ring-ink/5"
                        : "text-ink/55 hover:text-ink"
                    }`}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight">
                {mode === "signin" ? "Sign in" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-ink/55">
                {mode === "signin"
                  ? "Pick up where you left off."
                  : "Save your bag, bookings, and plant care notes."}
              </p>

              <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div>
                    <label htmlFor="name" className="text-sm font-medium">
                      Full name
                    </label>
                    <input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Fern"
                      aria-invalid={submitted && !!errors.name}
                      className={fieldClass(errors.name)}
                    />
                    {submitted && errors.name && (
                      <p className="mt-1 text-xs text-terra">{errors.name}</p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={submitted && !!errors.email}
                    className={fieldClass(errors.email)}
                  />
                  {submitted && errors.email && (
                    <p className="mt-1 text-xs text-terra">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-xs text-ink/55 transition hover:text-terra"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                      aria-invalid={submitted && !!errors.password}
                      className={`${fieldClass(errors.password)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 mt-[3px] grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink/45 transition hover:text-ink"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {submitted && errors.password && (
                    <p className="mt-1 text-xs text-terra">{errors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-ink/55">
                {mode === "signin" ? "New to Cormorant? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-terra transition hover:text-terra/80"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
