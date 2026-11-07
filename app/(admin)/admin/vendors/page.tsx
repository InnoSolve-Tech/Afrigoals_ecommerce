"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export default function VendorsPage() {
  const [accounts, setAccounts] = useState<
    { id: string; email: string; vendor: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [vendor, setVendor] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/admin/vendors", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    setAccounts(data);
  }
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, vendor }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setMessage("Vendor assigned. The account can sign in and visit /vendor.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Vendor accounts</h1>
      <p>
        Assign an existing verified account to the vendor name used on its
        products. Each account can view only that vendor's performance.
      </p>
      <form onSubmit={save} className="space-y-4">
        <label className="block" htmlFor="vendor-email">
          Account email
          <input
            id="vendor-email"
            required
            type="email"
            className="block w-full rounded border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block" htmlFor="vendor-name">
          Vendor name
          <input
            id="vendor-name"
            required
            className="block w-full rounded border p-2"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </label>
        <Button disabled={busy}>
          {busy ? "Saving…" : "Assign vendor account"}
        </Button>
      </form>
      {message && <p role="status">{message}</p>}
      <ul>
        {accounts.map((a) => (
          <li key={a.id} className="border-t py-3">
            {a.email} · {a.vendor}
          </li>
        ))}
      </ul>
    </section>
  );
}
