"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
  emailVerified?: boolean;
};

type AuthState =
  | { status: "loading"; user: null }
  | { status: "signed_out"; user: null }
  | { status: "signed_in"; user: AuthUser };

function normalizeUser(data: any): AuthUser | null {
  if (!data) return null;

  const id = String(data.id || "").trim();
  const email = String(data.email || "").trim();
  const role = String(data.role || "").trim().toLowerCase();

  if (!id || !email) return null;

  if (role !== "admin" && role !== "user") {
    return null;
  }

  return {
    id,
    email,
    name: typeof data.name === "string" ? data.name : undefined,
    role,
    emailVerified:
      typeof data.emailVerified === "boolean" ? data.emailVerified : undefined,
  };
}

export function useAuthState() {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!res.ok) {
        setState({
          status: "signed_out",
          user: null,
        });
        return;
      }

      const data = await res.json().catch(() => null);
      const user = normalizeUser(data);

      if (!user) {
        setState({
          status: "signed_out",
          user: null,
        });
        return;
      }

      setState({
        status: "signed_in",
        user,
      });
    } catch {
      setState({
        status: "signed_out",
        user: null,
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setState({
        status: "signed_out",
        user: null,
      });

      window.dispatchEvent(new Event("auth-changed"));
    }
  }, []);

  useEffect(() => {
    refresh();

    function handleAuthChanged() {
      refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("auth-changed", handleAuthChanged);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    ...state,
    isLoading: state.status === "loading",
    isSignedIn: state.status === "signed_in",
    isSignedOut: state.status === "signed_out",
    isAdmin: state.status === "signed_in" && state.user.role === "admin",
    refresh,
    signOut,
  };
}