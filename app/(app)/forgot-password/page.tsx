"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResetStartResponse = {
  success?: boolean;
  challengeId?: string;
  maskedEmail?: string;
  message?: string;
  error?: string;
};

type ResetConfirmResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

function safeNext(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function ForgotPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Email is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = (await res.json().catch(() => ({}))) as ResetStartResponse;

      if (!res.ok) {
        setError(data.error || "Failed to send reset code");
        return;
      }

      if (!data.challengeId) {
        setMessage(
          data.message || "If the email exists, a reset code has been sent.",
        );
        return;
      }

      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail || cleanEmail);
      setMessage(data.message || "Reset code sent.");
    } catch {
      setError("Failed to send reset code. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setMessage(null);

    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      setError("Reset code must be 6 digits");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          challengeId,
          code: cleanCode,
          newPassword,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as ResetConfirmResponse;

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      router.replace(`/signin?next=${encodeURIComponent(next)}&reset=1`);
      router.refresh();
    } catch {
      setError("Failed to reset password. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Reset password
      </h1>

      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Enter your account email and use the code sent to your inbox.
      </p>

      {!challengeId ? (
        <form onSubmit={onRequestReset} className="mt-6 space-y-3">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            disabled={loading}
          />

          {message ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onConfirmReset} className="mt-6 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter the 6-digit code sent to {maskedEmail}.
          </p>

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Reset code"
            autoComplete="one-time-code"
            required
            disabled={loading}
          />

          <Input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            required
            disabled={loading}
          />

          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            disabled={loading}
          />

          {message ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </Button>

          <button
            type="button"
            className="text-sm underline"
            onClick={() => {
              setChallengeId("");
              setMaskedEmail("");
              setCode("");
              setNewPassword("");
              setConfirmPassword("");
              setError(null);
              setMessage(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Remember your password?{" "}
        <Link
          className="font-medium underline"
          href={`/signin?next=${encodeURIComponent(next)}`}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
