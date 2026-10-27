import { createServerFn } from "@tanstack/react-start";
import { createPublishableClient } from "@/lib/supabase-public";

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(normaliseUsername(value));
}

/** Email behind a username, read with the service key. Never returned to the browser. */
async function emailForUsername(username: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", normaliseUsername(username))
    .maybeSingle();
  if (!profile) return null;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (error) return null;
  return data.user?.email ?? null;
}

export type UsernameSignInResult =
  | { status: "ok"; accessToken: string; refreshToken: string }
  | { status: "no-account" | "wrong-password" | "unconfirmed" };

/**
 * Signs in with a username. The password check happens here, against the account's email,
 * so the email itself never reaches the browser; the client receives only session tokens.
 */
export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => {
    if (typeof input?.username !== "string" || typeof input?.password !== "string") {
      throw new Error("Username and password are required");
    }
    return { username: input.username.slice(0, 40), password: input.password.slice(0, 200) };
  })
  .handler(async ({ data }): Promise<UsernameSignInResult> => {
    if (!isValidUsername(data.username)) return { status: "no-account" };
    const email = await emailForUsername(data.username);
    if (!email) return { status: "no-account" };

    const { data: auth, error } = await createPublishableClient().auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error) {
      if (error.code === "email_not_confirmed" || error.message === "Email not confirmed") {
        return { status: "unconfirmed" };
      }
      if (error.code === "invalid_credentials" || error.message === "Invalid login credentials") {
        return { status: "wrong-password" };
      }
      throw new Error(error.message);
    }
    return {
      status: "ok",
      accessToken: auth.session.access_token,
      refreshToken: auth.session.refresh_token,
    };
  });

/** Sends a reset link for a username's account. Always reports success so usernames can't be probed. */
export const requestUsernamePasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; redirectTo: string }) => {
    if (typeof input?.username !== "string" || typeof input?.redirectTo !== "string") {
      throw new Error("Username is required");
    }
    return { username: input.username.slice(0, 40), redirectTo: input.redirectTo.slice(0, 300) };
  })
  .handler(async ({ data }) => {
    if (!isValidUsername(data.username)) return { sent: true };
    const email = await emailForUsername(data.username);
    if (email) {
      await createPublishableClient().auth.resetPasswordForEmail(email, {
        redirectTo: data.redirectTo,
      });
    }
    return { sent: true };
  });

/** Sends a fresh confirmation email for a username's account. */
export const resendUsernameConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; redirectTo: string }) => {
    if (typeof input?.username !== "string" || typeof input?.redirectTo !== "string") {
      throw new Error("Username is required");
    }
    return { username: input.username.slice(0, 40), redirectTo: input.redirectTo.slice(0, 300) };
  })
  .handler(async ({ data }) => {
    if (!isValidUsername(data.username)) return { sent: true };
    const email = await emailForUsername(data.username);
    if (email) {
      await createPublishableClient().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: data.redirectTo },
      });
    }
    return { sent: true };
  });
