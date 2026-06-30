"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
};

type RegisterStartResponse = {
  requiresEmailVerification?: boolean;
  challengeId?: string;
  maskedEmail?: string;
  message?: string;
  error?: string;
};

type AuthResponse = {
  user?: AuthUser;
  error?: string;
};

function safeNext(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function completeAuth(user?: AuthUser | null) {
    if (user?.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace(next);
    }

    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);

    const cleanName = name.trim();
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

    if (cleanPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as RegisterStartResponse;

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      if (!data.requiresEmailVerification || !data.challengeId) {
        setError("Invalid server response");
        return;
      }

      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail || cleanEmail);

      // Clear sensitive password from React state after challenge starts.
      setPassword("");
    } catch {
      setError("Failed to create account. Check that the server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
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
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          challengeId,
          code: cleanCode,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as AuthResponse;

      if (!res.ok) {
        setError(data.error || "Email verification failed");
        return;
      }

      setCode("");
      setChallengeId("");
      completeAuth(data.user);
    } catch {
      setError("Email verification failed. Check that the server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignup(credential: string) {
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ credential }),
      });

      const data = (await res.json().catch(() => ({}))) as AuthResponse;

      if (!res.ok) {
        setError(data.error || "Google signup failed");
        return;
      }

      completeAuth(data.user);
    } catch {
      setError("Google signup failed. Check the backend /auth/google route.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Create account
      </h1>

      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Create your AfriGoals account using Google or email.
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

                onGoogleSignup(credentialResponse.credential);
              }}
              onError={() => {
                setError("Google signup failed");
              }}
              useOneTap={false}
            />

            {googleLoading ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Signing up with Google...
              </p>
            ) : null}
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs font-medium text-zinc-500">OR</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Name optional"
              autoComplete="name"
              disabled={loading || googleLoading}
            />

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
              autoComplete="new-password"
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
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              className="font-medium underline"
              href={`/signin?next=${encodeURIComponent(next)}`}
            >
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <form onSubmit={onVerifySubmit} className="mt-6 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter the 6-digit verification code sent to {maskedEmail}.
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
            {loading ? "Verifying..." : "Verify and create account"}
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
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}