import { logoutSession } from "@/lib/auth/events";

// Confirm the server session rather than trusting the login response role.
export async function verifyAdminSession(
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  const response = await fetcher("/api/auth/me", { cache: "no-store" });
  const user = await response.json().catch(() => null);
  if (!response.ok)
    return "Could not verify your session. Please sign in again.";
  if (user?.role !== "admin") {
    await logoutSession(fetcher);
    return "This account is not an admin.";
  }
  return null;
}
