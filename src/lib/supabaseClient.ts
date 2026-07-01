import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import type {
  AuthChangeEvent,
  OAuthResponse,
  Session,
  SignInWithOAuthCredentials,
  SupabaseClient,
} from "@supabase/supabase-js";

// Lazily-instantiated browser-side Supabase client. Built on first access
// rather than at module import time so that simply *importing* this module
// (e.g. Next.js loading the page module during `next build`'s page-data
// collection step) never requires env vars to be present. Real usage always
// happens inside the browser, where NEXT_PUBLIC_* vars are baked in.
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!client) {
    client = createPagesBrowserClient();
  }
  return client;
}

export const supabase = {
  auth: {
    getSession: () => getClient().auth.getSession(),
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) => getClient().auth.onAuthStateChange(callback),
    signInWithOAuth: (
      credentials: SignInWithOAuthCredentials
    ): Promise<OAuthResponse> => getClient().auth.signInWithOAuth(credentials),
    signOut: () => getClient().auth.signOut(),
  },
};
