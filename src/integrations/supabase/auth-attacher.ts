import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Sends the signed-in user's access token with every server function call, so
// `requireSupabaseAuth` (auth-middleware.ts) can read it from the Authorization header.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  },
);
