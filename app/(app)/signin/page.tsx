"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
};

type AuthResponse = {
  token?: string;
  user?: AuthUser;
  error?: string;
};

type LoginStartResponse = {
  requires2fa?: boolean;
  challengeId?: string;
  maskedEmail?: string;
  message?: string;
  error?: string;
};

function safeNext(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function clearOldAuthCookies() {
    document.cookie = `auth_token=; path=/; max-age=0; samesite=lax`;
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  }

  function saveClientSession(token: string, user?: AuthUser | null) {
    clearOldAuthCookies();

    document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${
      60 * 60 * 24 * 7
    }; samesite=lax`;

    if (user) {
      localStorage.setItem("auth_user", JSON.stringify(user));
    }

    window.dispatchEvent(new Event("auth-changed"));
  }

  function completeAuth(data: AuthResponse) {
    if (!data.token) {
      setError("Authentication token missing from server response");
      return;
    }

    if (!data.user) {
      setError("User details missing from server response");
      return;
    }

    saveClientSession(data.token, data.user);

    if (data.user.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace(next);
    }

    router.refresh();
  }

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      setError("Email is required");
      return;
    }

    if (!cleanPassword) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as LoginStartResponse;

      if (!res.ok) {
        setError(data.error || "Failed to sign in");
        return;
      }

      if (!data.requires2fa || !data.challengeId) {
        setError("Invalid server response");
        return;
      }

      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail || cleanEmail);
      setPassword("");
    } catch (err) {
      console.error(err);
      setError("Failed to sign in. Make sure the Go API is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);

    const cleanCode = code.trim();

    if (!cleanCode) {
      setError("Verification code is required");
      return;
    }

    if (cleanCode.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          challengeId,
          code: cleanCode,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as AuthResponse;

      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setCode("");
      setChallengeId("");
      setMaskedEmail("");

      completeAuth(data);
    } catch (err) {
      console.error(err);
      setError("Verification failed. Make sure the Go API is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignin(credential: string) {
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ credential }),
      });

      const data = (await res.json().catch(() => ({}))) as AuthResponse;

      if (!res.ok) {
        setError(data.error || "Google sign in failed");
        return;
      }

      completeAuth(data);
    } catch (err) {
      console.error(err);
      setError("Google sign in failed. Check the backend /auth/google route.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Sign in
      </h1>

      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Sign in using Google or your email and password.
      </p>

      {!challengeId ? (
        <>
          <div className="mt-6">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (!credentialResponse.credential) {
                  setError("Google did not return a valid credential");
                  return;
                }

                onGoogleSignin(credentialResponse.credential);
              }}
              onError={() => {
                setError("Google sign in failed");
              }}
              useOneTap={false}
            />

            {googleLoading ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Signing in with Google...
              </p>
            ) : null}
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs font-medium text-zinc-500">OR</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={onPasswordSubmit} className="space-y-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              disabled={loading || googleLoading}
            />

            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              disabled={loading || googleLoading}
            />

            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || googleLoading}
            >
              {loading ? "Checking..." : "Continue"}
            </Button>
          </form>
        </>
      ) : (
        <form onSubmit={onCodeSubmit} className="mt-6 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter the 6-digit code sent to {maskedEmail}.
          </p>

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Verification code"
            autoComplete="one-time-code"
            required
            disabled={loading}
          />

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify and sign in"}
          </Button>

          <button
            type="button"
            className="text-sm underline"
            onClick={() => {
              setChallengeId("");
              setMaskedEmail("");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      {!challengeId ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No account?{" "}
          <Link
            className="font-medium underline"
            href={`/signup?next=${encodeURIComponent(next)}`}
          >
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}