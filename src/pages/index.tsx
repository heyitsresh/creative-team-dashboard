import { useEffect } from "react";
import { useRouter } from "next/router";

// Root just forwards to the dashboard; useRequireUser on the dashboard pages
// bounces unauthenticated visitors to /login.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
