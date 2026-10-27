import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** The signed-in user, kept in sync with sign-in and sign-out. `ready` is false until the session is known. */
export function useSessionUser(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, ready };
}

export function fullName(user: User | null): string {
  const meta = user?.user_metadata ?? {};
  const name = (meta["full_name"] ?? meta["name"]) as string | undefined;
  return name?.trim() || "";
}

/** First name for greetings, falling back to username, then the email's local part. */
export function firstName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return (
    fullName(user).split(/\s+/)[0] ||
    (meta["username"] as string | undefined) ||
    user.email?.split("@")[0] ||
    ""
  );
}
