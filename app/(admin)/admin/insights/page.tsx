"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
type Product = {
  productId: string;
  name: string;
  stock: number;
  units: number;
  revenue: number;
  reviewCount: number;
  averageRating: number;
};
type Overview = {
  report: {
    totals: {
      paidOrders: number;
      productSales: number;
      deliveryFees: number;
      riderPayouts: number;
      deliveryCommission: number;
      outstandingCod: number;
    };
  };
  performance: Product[];
  daily: { day: string; revenue: number; orders: number }[];
  iotecReceived: number;
  customers: number;
};
type Wallet = {
  actualBalance: number;
  name: string;
  currency: string;
  checkedAt: string;
};
export default function InsightsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState(
    "Which products should we promote and which need attention? Explain using recorded sales and stock.",
  );
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    setWalletError("");
    await Promise.all([
      fetch("/api/admin/commerce/overview", { cache: "no-store" })
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw Error(body.error);
          setData(body);
        })
        .catch((e) => setError(e.message)),
      fetch("/api/admin/iotec/wallet", { cache: "no-store" })
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw Error(body.error);
          setWallet(body);
        })
        .catch((e) => {
          setWallet(null);
          setWalletError(e.message);
        }),
    ]);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setThinking(true);
    try {
      const r = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      setAnswer(body.answer);
    } catch (e) {
      setAnswer(e instanceof Error ? e.message : "Could not answer");
    } finally {
      setThinking(false);
    }
  }
  const max = Math.max(1, ...(data?.daily.map((d) => d.revenue) ?? []));
  const best = data?.performance.filter((p) => p.units > 0).slice(0, 8) ?? [];
  const maxUnits = Math.max(1, ...best.map((p) => p.units));
  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Commerce insights</h1>
        <Button onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh reports and wallet"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Live IOTEC wallet",
            wallet
              ? formatPrice(wallet.actualBalance, wallet.currency.toLowerCase())
              : "Unavailable",
          ],
          [
            "Verified IOTEC collections",
            data ? formatPrice(data.iotecReceived) : "…",
          ],
          [
            "Paid product sales",
            data ? formatPrice(data.report.totals.productSales) : "…",
          ],
          ["Verified clients", data ? String(data.customers) : "…"],
        ].map(([label, value]) => (
          <section
            key={label}
            className="rounded-xl border bg-white p-5 dark:bg-zinc-950"
          >
            <h2 className="text-sm text-zinc-500">{label}</h2>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </section>
        ))}
      </div>
      <p className="text-sm text-zinc-500">
        The wallet is a live provider balance. Collections are payments verified
        in Afrigoals records and can differ because of fees, withdrawals or
        other wallet activity.
        {wallet &&
          ` Wallet checked ${new Date(wallet.checkedAt).toLocaleString()}.`}
      </p>
      {walletError && (
        <p
          role="status"
          className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          {walletError}
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border p-5">
              <h2 className="font-semibold">
                Daily paid revenue · last 30 days
              </h2>
              <p className="text-sm text-zinc-500">
                Includes delivery. Dates with payments are shown.
              </p>
              {data.daily.length ? (
                <svg
                  role="img"
                  aria-label="Daily paid revenue chart"
                  viewBox="0 0 720 250"
                  className="mt-4 w-full"
                >
                  <title>Daily paid order revenue</title>
                  {data.daily.map((d, i) => {
                    const width = 640 / data.daily.length;
                    const height = (d.revenue / max) * 170;
                    return (
                      <g key={d.day}>
                        <rect
                          x={45 + i * width}
                          y={190 - height}
                          width={Math.max(2, width - 4)}
                          height={height}
                          fill="#4263eb"
                        >
                          <title>
                            {d.day}: {formatPrice(d.revenue)}, {d.orders} paid
                            orders
                          </title>
                        </rect>
                        {(i === 0 || i === data.daily.length - 1) && (
                          <text x={45 + i * width} y="215" fontSize="12">
                            {d.day.slice(0, 10)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text x="45" y="20" fontSize="12">
                    Peak: {formatPrice(max)}
                  </text>
                </svg>
              ) : (
                <p className="py-10 text-zinc-500">
                  No paid revenue recorded in this period.
                </p>
              )}
            </section>
            <section className="rounded-xl border p-5">
              <h2 className="font-semibold">Top products by paid units</h2>
              <div className="mt-4 space-y-3">
                {best.map((p) => (
                  <div key={p.productId}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>{p.name}</span>
                      <span>{p.units} sold</span>
                    </div>
                    <div className="mt-1 h-3 rounded bg-zinc-100">
                      <div
                        className="h-3 rounded bg-emerald-600"
                        style={{ width: `${(p.units / maxUnits) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!best.length && <p>No paid product sales yet.</p>}
              </div>
            </section>
          </div>
          <section className="overflow-x-auto rounded-xl border">
            <h2 className="p-5 font-semibold">Current catalog performance</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Product",
                    "Paid units",
                    "Product revenue",
                    "Stock",
                    "Reviews",
                  ].map((label) => (
                    <th className="p-3" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.performance.map((p) => (
                  <tr className="border-t" key={p.productId}>
                    <td className="p-3">{p.name}</td>
                    <td>{p.units}</td>
                    <td>{formatPrice(p.revenue)}</td>
                    <td>{p.stock}</td>
                    <td>
                      {p.reviewCount
                        ? `${p.averageRating.toFixed(1)}/5 (${p.reviewCount})`
                        : "No reviews"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="rounded-xl border p-5">
            <h2 className="font-semibold">
              Products with no recorded paid sales
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Check availability, listing age and exposure before treating zero
              sales as poor demand.
            </p>
            <ul className="mt-3 list-inside list-disc">
              {data.performance
                .filter((p) => p.units === 0)
                .map((p) => (
                  <li key={p.productId}>
                    {p.name} · {p.stock} in stock
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Ask the commerce AI</h2>
        <p className="text-sm text-zinc-500">
          Uses the scout AI provider with store sales and inventory evidence. It
          can advise and draft copy; it cannot change records or send campaigns.
        </p>
        <form onSubmit={ask} className="mt-4 space-y-3">
          <label htmlFor="admin-question" className="block">
            Question
          </label>
          <textarea
            id="admin-question"
            required
            maxLength={10000}
            rows={3}
            className="w-full rounded border p-3"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button disabled={thinking}>
            {thinking ? "Analysing…" : "Ask AI"}
          </Button>
        </form>
        {answer && (
          <div className="prose mt-5 max-w-none dark:prose-invert">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </section>
    </main>
  );
}
