import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "avenue7media.com";

/**
 * Client-side auth guard. Redirects to /login if there's no session, or if
 * the signed-in email isn't on the allowed domain (belt-and-suspenders on
 * top of the Supabase RLS policies, which enforce the same rule server-side).
 */
export function useRequireUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      if (!sessionUser || !isAllowed(sessionUser.email)) {
        setUser(null);
        router.replace("/login");
      } else {
        setUser(sessionUser);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      if (!sessionUser || !isAllowed(sessionUser.email)) {
        setUser(null);
        if (router.pathname !== "/login") router.replace("/login");
      } else {
        setUser(sessionUser);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return user;
}

function isAllowed(email?: string | null) {
  return !!email && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export async function signOut() {
  await supabase.auth.signOut();
}
