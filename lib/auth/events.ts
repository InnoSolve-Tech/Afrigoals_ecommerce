export type AuthChange = "signed_in" | "signed_out";
const STORAGE_KEY = "afrigoals_auth_change";

export function notifyAuthChange(change: AuthChange) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("auth-changed", { detail: change }));
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ change, nonce: Date.now() + Math.random() }),
    );
  } catch {}
}

export function subscribeAuthChanges(listener: (change?: AuthChange) => void) {
  const local = (event: Event) =>
    listener((event as CustomEvent<AuthChange>).detail);
  const remote = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const { change } = JSON.parse(event.newValue);
      if (change === "signed_in" || change === "signed_out") listener(change);
    } catch {}
  };
  window.addEventListener("auth-changed", local);
  window.addEventListener("storage", remote);
  return () => {
    window.removeEventListener("auth-changed", local);
    window.removeEventListener("storage", remote);
  };
}

export async function logoutSession(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not sign out. Please try again.");
  try {
    window.localStorage.removeItem("auth_user");
  } catch {}
  notifyAuthChange("signed_out");
}
