"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logoutSession, subscribeAuthChanges } from "@/lib/auth/events";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user" | "vendor";
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
  const role = String(data.role || "")
    .trim()
    .toLowerCase();

  if (!id || !email) return null;

  if (role !== "admin" && role !== "user" && role !== "vendor") {
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

  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (version !== requestVersion.current) return;
      if (!res.ok) {
        setState({
          status: "signed_out",
          user: null,
        });
        return;
      }

      const data = await res.json().catch(() => null);
      if (version !== requestVersion.current) return;
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
      if (version !== requestVersion.current) return;
      setState({
        status: "signed_out",
        user: null,
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    ++requestVersion.current;
    await logoutSession();
    setState({ status: "signed_out", user: null });
  }, []);

  useEffect(() => {
    refresh();

    const unsubscribe = subscribeAuthChanges((change) => {
      if (change === "signed_out") {
        ++requestVersion.current;
        setState({ status: "signed_out", user: null });
      } else {
        setState({ status: "loading", user: null });
        refresh();
      }
    });
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setState({ status: "loading", user: null });
        refresh();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
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
