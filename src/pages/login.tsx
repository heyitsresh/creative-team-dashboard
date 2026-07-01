import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "avenue7media.com";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (email?.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { hd: ALLOWED_DOMAIN },
      },
    });
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center animate-pop-in">
        <div className="mx-auto mb-8 h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-card">
          A7
        </div>
        <h1 className="text-white text-xl font-semibold mb-2">
          Creative Dashboard
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Sign in with your @{ALLOWED_DOMAIN} account
        </p>
        <button
          onClick={signIn}
          className="btn-press w-full bg-white text-ink font-medium rounded-pill py-3 text-sm hover:bg-primary-light transition"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

// Forces this page to render per-request instead of being statically
// prerendered at build time — it needs a live Supabase session, and static
// generation would try (and fail) to construct the Supabase client without
// a request context.
export async function getServerSideProps() {
  return { props: {} };
}
