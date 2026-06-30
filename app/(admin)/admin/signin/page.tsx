"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function safeAdminNext(value: string | null) {
  if (!value) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}

function AdminSignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAdminNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as any)?.error || "Failed to sign in");
        return;
      }

      if (!(data as any)?.requires2fa || !(data as any)?.challengeId) {
        setError("Invalid server response");
        return;
      }

      setChallengeId((data as any).challengeId);
      setMaskedEmail((data as any).maskedEmail || email);
      setPassword("");
    } catch {
      setError("Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function onCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const verifyRes = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId,
          code: code.trim(),
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok) {
        setError((verifyData as any)?.error || "Verification failed");
        return;
      }

      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const me = await meRes.json().catch(() => null);

      if (!meRes.ok || me?.role !== "admin") {
        await fetch("/api/auth/logout", { method: "POST" });
        setError("This account is not an admin.");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Admin sign in
      </h1>

      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Admin access requires password and email verification code.
      </p>

      {!challengeId ? (
        <form onSubmit={onPasswordSubmit} className="mt-6 space-y-3">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Admin email"
            autoComplete="email"
            required
            disabled={loading}
          />

          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            disabled={loading}
          />

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Checking..." : "Continue"}
          </Button>
        </form>
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
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify admin login"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function AdminSignInPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
    >
      <AdminSignInInner />
    </Suspense>
  );
}