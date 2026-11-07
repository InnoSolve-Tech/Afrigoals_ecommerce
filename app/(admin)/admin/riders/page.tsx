"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export default function RidersPage() {
  const [orderId, setOrderId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [riders, setRiders] = useState<
    { id: string; name: string; email: string; status: string }[]
  >([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/admin/riders", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    setRiders(data);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function review(id: string, status: string) {
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/riders/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update rider");
    } finally {
      setBusy(false);
    }
  }
  async function assign(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/assign-rider`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ riderId }),
        },
      );
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setError("Delivery assigned. The rider can view it in /rider.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not assign delivery",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Rider accounts</h1>
      <form onSubmit={assign} className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Assign a delivery</h2>
        <label className="block" htmlFor="assign-order">
          Order ID (from its admin order page)
          <input
            id="assign-order"
            required
            className="block w-full rounded border p-2"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          />
        </label>
        <label className="block" htmlFor="assign-rider">
          Approved rider
          <select
            id="assign-rider"
            required
            className="block w-full rounded border p-2"
            value={riderId}
            onChange={(event) => setRiderId(event.target.value)}
          >
            <option value="">Select a rider</option>
            {riders
              .filter((r) => r.status === "approved")
              .map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name} · {r.email}
                </option>
              ))}
          </select>
        </label>
        <Button disabled={busy}>Assign delivery</Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {riders.map((r) => (
        <article key={r.id} className="space-y-3 rounded border p-4">
          <h2>
            {r.name} · {r.email}
          </h2>
          <p>{r.status}</p>
          <div className="flex flex-wrap gap-3">
            {["approved", "rejected", "suspended"].map((status) => (
              <Button
                key={status}
                disabled={busy || r.status === status}
                variant="outline"
                onClick={() => void review(r.id, status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </main>
  );
}
