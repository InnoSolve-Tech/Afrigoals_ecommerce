import { apiGet } from "@/lib/api/client";
type Store = {
  id: string;
  name: string;
  description: string;
  keywords: string;
  phone: string;
  website: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
};
export const dynamic = "force-dynamic";
export default async function PartnerStoresPage() {
  let stores: Store[] = [];
  let error = "";
  try {
    stores = await apiGet<Store[]>("/partner-stores");
  } catch {
    error = "The store directory is temporarily unavailable.";
  }
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Other stores to explore</h1>
      <p>
        External stores listed by Afrigoals. Contact each store directly to
        confirm products, availability and prices.
      </p>
      {error && <p role="alert">{error}</p>}
      {!error && !stores.length && (
        <p>No external stores have been listed yet.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {stores.map((store) => (
          <article key={store.id} className="space-y-3 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">{store.name}</h2>
            <p>{store.description}</p>
            <p className="text-sm text-zinc-500">{store.keywords}</p>
            {store.phone && <p>Phone: {store.phone}</p>}
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["Website name", store.website],
                  ["Instagram", store.instagram],
                  ["TikTok", store.tiktok],
                  ["WhatsApp", store.whatsapp],
                ] as const
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex flex-wrap gap-x-2">
                    <dt className="font-medium">{label}:</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </article>
        ))}
      </div>
    </main>
  );
}
