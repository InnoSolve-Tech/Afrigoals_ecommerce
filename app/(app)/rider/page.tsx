"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryStatus?: string;
  deliveryAddress: string;
  deliveryFee: number;
  deliveryServiceFee?: number;
  riderPayout?: number;
};
export default function RiderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/rider/orders", { cache: "no-store" });
    if (r.status === 401) {
      setSignedIn(false);
      return;
    }
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    setOrders(data);
    setSignedIn(true);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }
  async function accept(id: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/rider/orders/${encodeURIComponent(id)}/accept`,
        { method: "POST" },
      );
      if (!r.ok) {
        const data = await r.json();
        throw Error(data.error);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept");
    } finally {
      setBusy(false);
    }
  }
  const earned = orders
    .filter((o) => o.status === "delivered" || o.deliveryStatus === "delivered")
    .reduce((total, o) => total + (o.riderPayout ?? 0), 0);
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Rider dashboard</h1>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {!signedIn ? (
        <form onSubmit={login} className="max-w-md space-y-4">
          <p>Sign in with an approved rider account.</p>
          <label htmlFor="rider-email" className="block">
            Email
            <input
              id="rider-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded border p-2"
            />
          </label>
          <label htmlFor="rider-password" className="block">
            Password
            <input
              id="rider-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded border p-2"
            />
          </label>
          <Button disabled={busy}>Sign in</Button>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xl font-semibold">
              Earned on completed deliveries: {formatPrice(earned)}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                fetch("/api/rider/login", { method: "DELETE" }).then(() => {
                  setSignedIn(false);
                  setOrders([]);
                })
              }
            >
              Sign out
            </Button>
          </div>
          <p>
            Your payout is the delivery fee minus the Afrigoals commission.
            Pending deliveries are not counted as earned.
          </p>
          {orders.length === 0 && <p>No assigned deliveries.</p>}
          {orders.map((o) => (
            <article key={o.id} className="space-y-2 rounded-xl border p-5">
              <h2 className="font-semibold">{o.orderNumber}</h2>
              <p>{o.deliveryAddress}</p>
              <p>
                Status: {o.status} · {o.deliveryStatus}
              </p>
              <p>
                Delivery fee: {formatPrice(o.deliveryFee)} · Commission:{" "}
                {formatPrice(o.deliveryServiceFee ?? 0)}
              </p>
              <p className="font-semibold">
                Your payout: {formatPrice(o.riderPayout ?? 0)}
              </p>
              {o.deliveryStatus === "assigned" && (
                <Button disabled={busy} onClick={() => void accept(o.id)}>
                  Accept delivery
                </Button>
              )}
            </article>
          ))}
        </>
      )}
    </main>
  );
}
