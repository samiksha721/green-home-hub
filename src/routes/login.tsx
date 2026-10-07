import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } =>
    search["mode"] === "signup" ? { mode: "signup" } : {},
  head: () => ({
    meta: [
      { title: "Sign in — Roots" },
      {
        name: "description",
        content: "Sign in to your Roots account to manage orders and garden appointments.",
      },
    ],
  }),
  component: Login,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LAST_EMAIL_KEY = "last-email";

// Why a sign-in or sign-up attempt didn't go through, so we can offer the right next step.
type Problem = "wrong-password" | "no-account" | "unconfirmed" | "already-registered";

// Error codes only reach the browser when the API version header is readable, so fall back to
// Supabase's fixed messages.
function isAuthError(
  error: { code?: string | undefined; message: string },
  code: string,
  message: string,
) {
  return error.code === code || error.message === message;
}

function rememberEmail(email: string) {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email.trim());
  } catch {
    // storage unavailable; returning users just retype their email
  }
}

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
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);

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

  const clearMessages = () => {
    setAuthError("");
    setNotice("");
    setProblem(null);
  };

  const switchMode = (next: Mode) => {
    setSubmitted(false);
    clearMessages();
    navigate({ search: next === "signup" ? { mode: "signup" } : {}, replace: true });
  };

  // Returning users: prefill the email they last signed in with.
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY);
      if (last) setEmail((current) => current || last);
      // Nobody has signed in on this device before: start them on registration.
      else if (!search.mode) navigate({ search: { mode: "signup" }, replace: true });
    } catch {
      // storage unavailable
    }
    // Only on first load, so switching tabs afterwards isn't overridden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", search: {} as never, replace: true });
    });
  }, [navigate]);

  const onForgot = async () => {
    clearMessages();
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

  const onResendConfirmation = async () => {
    clearMessages();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
    else setNotice("We've sent a new confirmation link to " + email + ".");
  };

  const goRegister = () => {
    setPassword("");
    switchMode("signup");
  };

  const tryAnotherEmail = () => {
    clearMessages();
    setEmail("");
    setPassword("");
    document.getElementById("email")?.focus();
  };

  const goSignIn = () => {
    setPassword("");
    switchMode("signin");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    clearMessages();
    if (hasErrors) return;
    setPending(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        setPending(false);
        rememberEmail(email);
        navigate({ to: "/", search: {} as never });
        return;
      }
      if (isAuthError(error, "email_not_confirmed", "Email not confirmed")) {
        setPending(false);
        setProblem("unconfirmed");
        return;
      }
      if (isAuthError(error, "invalid_credentials", "Invalid login credentials")) {
        // Supabase reports a wrong password and an unknown email the same way; ask which it is.
        const { data: registered, error: lookupError } = await supabase.rpc("email_registered", {
          p_email: email,
        });
        setPending(false);
        if (lookupError) return setAuthError("That email or password isn't right.");
        setProblem(registered ? "wrong-password" : "no-account");
        return;
      }
      setPending(false);
      setAuthError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
      });
      setPending(false);
      if (error) {
        if (isAuthError(error, "user_already_exists", "User already registered")) {
          return setProblem("already-registered");
        }
        return setAuthError(error.message);
      }
      // With email confirmation on, Supabase hides existing accounts by returning a user with no identities.
      if (data.user && data.user.identities?.length === 0) return setProblem("already-registered");
      rememberEmail(email);
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
    <div className="relative min-h-screen overflow-clip bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <div className="animate-drift pointer-events-none absolute -left-32 -top-40 size-[560px] rounded-full bg-sage/25 blur-3xl dark:opacity-50" />
      <div className="animate-drift-reverse pointer-events-none absolute right-[-160px] top-1/3 size-[520px] rounded-full bg-terra/15 blur-3xl dark:opacity-50" />

      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full border border-ink/10 bg-surface/85 py-2 pl-2.5 pr-2 shadow-lg shadow-ink/5 backdrop-blur-xl">
          <Link to="/" className="rounded-full pr-2" aria-label="Roots home">
            <Logo />
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

      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 lg:min-h-[calc(100vh-68px)] lg:grid-cols-[1fr_440px] lg:py-0">
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
                  ? "Check your email to confirm your account."
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
                        onClick={onForgot}
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

                {problem && (
                  <ProblemCallout
                    problem={problem}
                    email={email}
                    onForgot={onForgot}
                    onRegister={goRegister}
                    onSignIn={goSignIn}
                    onTryAnother={tryAnotherEmail}
                    onResend={onResendConfirmation}
                  />
                )}
                {authError && <p className="text-xs text-terra">{authError}</p>}
                {notice && <p className="text-xs text-sage">{notice}</p>}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-ink/55">
                {mode === "signin" ? "New to Roots? " : "Already have an account? "}
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

const PROBLEM_COPY: Record<Problem, { title: string; body: (email: string) => string }> = {
  "wrong-password": {
    title: "Forgot your email or password?",
    body: (email) =>
      `We found an account for ${email}, but that password is incorrect. Reset it, or sign in with a different email.`,
  },
  "no-account": {
    title: "We don't recognise this email",
    body: (email) => `There's no Roots account for ${email} yet. Register to get started.`,
  },
  unconfirmed: {
    title: "Confirm your email first",
    body: (email) => `Click the link we sent to ${email} to finish registering, then sign in.`,
  },
  "already-registered": {
    title: "You already have an account",
    body: (email) => `${email} is already registered. Sign in instead.`,
  },
};

function ProblemCallout({
  problem,
  email,
  onForgot,
  onRegister,
  onSignIn,
  onResend,
  onTryAnother,
}: {
  problem: Problem;
  email: string;
  onForgot: () => void;
  onRegister: () => void;
  onSignIn: () => void;
  onResend: () => void;
  onTryAnother: () => void;
}) {
  const copy = PROBLEM_COPY[problem];
  const action = "rounded-full px-3 py-1.5 text-xs font-medium transition";
  const primary = `${action} bg-ink text-cream hover:bg-ink/90`;
  const secondary = `${action} border border-ink/10 bg-surface/60 hover:border-ink/30`;

  return (
    <div role="alert" className="rounded-2xl border border-terra/30 bg-terra/5 p-3.5">
      <p className="text-sm font-medium text-terra">{copy.title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink/65">{copy.body(email)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {problem === "wrong-password" && (
          <>
            <button type="button" onClick={onForgot} className={primary}>
              Email me a reset link
            </button>
            <button type="button" onClick={onTryAnother} className={secondary}>
              Use a different email
            </button>
          </>
        )}
        {problem === "no-account" && (
          <>
            <button type="button" onClick={onRegister} className={primary}>
              Register with this email
            </button>
            <button type="button" onClick={onTryAnother} className={secondary}>
              Use a different email
            </button>
          </>
        )}
        {problem === "unconfirmed" && (
          <button type="button" onClick={onResend} className={primary}>
            Resend confirmation email
          </button>
        )}
        {problem === "already-registered" && (
          <button type="button" onClick={onSignIn} className={primary}>
            Go to sign in
          </button>
        )}
      </div>
    </div>
  );
}
