"use client";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
type Report = {
  vendor: string;
  sales: number;
  units: number;
  products: {
    productId: string;
    name: string;
    stock: number;
    units: number;
    sales: number;
    reviewCount: number;
    averageRating: number;
  }[];
};
export default function VendorPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/vendor/overview", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setReport(data);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Vendor performance</h1>
      {error && <p role="alert">{error}</p>}
      {!report && !error && <p>Loading your products…</p>}
      {report && (
        <>
          <h2>{report.vendor}</h2>
          <p>
            {report.units} units sold · {formatPrice(report.sales)} paid product
            sales
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {[
                    "Product",
                    "Stock",
                    "Units sold",
                    "Paid sales",
                    "Reviews",
                  ].map((label) => (
                    <th className="p-3" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.products.map((p) => (
                  <tr key={p.productId} className="border-t">
                    <td className="p-3">{p.name}</td>
                    <td>{p.stock}</td>
                    <td>{p.units}</td>
                    <td>{formatPrice(p.sales)}</td>
                    <td>
                      {p.reviewCount
                        ? `${p.averageRating.toFixed(1)} / 5 (${p.reviewCount})`
                        : "No reviews"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
