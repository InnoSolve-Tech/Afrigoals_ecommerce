"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
type Store = {
  id?: string;
  name: string;
  description: string;
  keywords: string;
  phone: string;
  website: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  active: boolean;
};
const empty: Store = {
  name: "",
  description: "",
  keywords: "",
  phone: "",
  website: "",
  instagram: "",
  tiktok: "",
  whatsapp: "",
  active: true,
};
export default function PartnerStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState<Store>(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/admin/partner-stores", { cache: "no-store" });
    const body = await r.json();
    if (!r.ok) throw Error(body.error);
    setStores(body);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/partner-stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      setForm(empty);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save store");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Partner store directory</h1>
      <p>
        List external stores such as Vargo Sports, the products or teams they
        specialise in, and their contact numbers and social account names. The
        shopping assistant can suggest active entries when Afrigoals has no
        matching product. Availability is confirmed with the external store.
      </p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={save} className="space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">
          {form.id ? "Edit store" : "Add store"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Store name"],
              [
                "keywords",
                "Products / teams / keywords (e.g. Manchester United, Arsenal jerseys)",
              ],
              ["phone", "Phone"],
              ["website", "Website name"],
              ["instagram", "Instagram name"],
              ["tiktok", "TikTok name"],
              ["whatsapp", "WhatsApp number"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} htmlFor={key} className="block text-sm">
              {label}
              <input
                id={key}
                type={key === "phone" || key === "whatsapp" ? "tel" : "text"}
                inputMode={
                  key === "phone" || key === "whatsapp" ? "tel" : "text"
                }
                placeholder={
                  key === "phone" || key === "whatsapp"
                    ? "+256708021202"
                    : key === "instagram" || key === "tiktok"
                      ? "Vargo Sports or @vargosports"
                      : undefined
                }
                required={key === "name"}
                className="mt-1 block w-full rounded border p-2"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <label htmlFor="store-description" className="block">
          Description
          <textarea
            id="store-description"
            rows={3}
            className="mt-1 block w-full rounded border p-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Visible to customers and the assistant
        </label>
        <div className="flex gap-3">
          <Button disabled={busy}>Save store</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setForm(empty)}
          >
            New entry
          </Button>
        </div>
      </form>
      {stores.map((store) => (
        <article
          key={store.id}
          className="flex items-center justify-between gap-4 rounded border p-4"
        >
          <div>
            <h2 className="font-semibold">
              {store.name} · {store.active ? "Active" : "Hidden"}
            </h2>
            <p>{store.keywords}</p>
            <p>{store.phone}</p>
          </div>
          <Button variant="outline" onClick={() => setForm(store)}>
            Edit
          </Button>
        </article>
      ))}
    </main>
  );
}
