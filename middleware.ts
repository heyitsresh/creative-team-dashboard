import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "avenue7media.com";

// Server-side guard for everything under /dashboard. The client-side
// useRequireUser() hook handles redirects too, but this stops the page
// (and any data it would fetch) from ever rendering for a logged-out or
// off-domain visitor.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user?.email?.toLowerCase();
  const allowed = !!email && email.endsWith(`@${ALLOWED_DOMAIN}`);

  if (!allowed) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
