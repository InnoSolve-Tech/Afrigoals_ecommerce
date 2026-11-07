"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readDeliveryPricing } from "@/lib/api/read-delivery-pricing";

const fields = [
  ["originLat", "Shop latitude"],
  ["originLng", "Shop longitude"],
  ["baseFee", "Base fee (UGX)"],
  ["minimumFee", "Minimum fee (UGX)"],
  ["roundToNearest", "Round to nearest (UGX)"],
  ["petrolPerLitre", "Petrol price per litre (UGX)"],
  ["motorcycleKmPerLitre", "Motorcycle kilometres per litre"],
  ["roundTripFactor", "Round trip factor"],
  ["riderMarginPerKm", "Rider margin per kilometre (UGX)"],
  ["peakMultiplier", "Peak traffic multiplier"],
  ["moderateMultiplier", "Moderate traffic multiplier"],
  ["offPeakMultiplier", "Off-peak traffic multiplier"],
  ["longDistanceThresholdKm", "Long-distance threshold (km)"],
  ["longDistanceFeeUGX", "Long-distance flat fee (UGX)"],
] as const;
type Settings = {
  serviceFeeRate: number;
  mode: "flat" | "distance";
  flatFee: number;
  pricing: Record<string, number>;
};

export default function DeliveryPricingPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/admin/delivery-pricing", {
        cache: "no-store",
      });
      const data = await readDeliveryPricing(response);
      setSettings(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load delivery pricing",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/delivery-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await readDeliveryPricing(response);
      setSettings(data);
      setMessage(
        "Delivery pricing saved. New quotes and orders now use these settings.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save delivery pricing",
      );
    } finally {
      setSaving(false);
    }
  }
  const inputClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Delivery pricing</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Choose a flat fee for testing or distance-based rates. Changes apply
          to new quotes and orders; existing orders keep their original totals.
        </p>
      </div>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-4 text-green-800"
        >
          {message}
        </div>
      )}
      {!settings ? (
        <Button onClick={() => void load()}>Reload settings</Button>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <fieldset
            disabled={saving}
            className="space-y-6 rounded-xl border bg-white p-6 dark:bg-zinc-950"
          >
            <label
              className="block text-sm font-medium"
              htmlFor="delivery-mode"
            >
              Pricing method
              <select
                id="delivery-mode"
                className={inputClass}
                value={settings.mode}
                onChange={(event) => {
                  setMessage("");
                  setSettings({
                    ...settings,
                    mode: event.target.value as Settings["mode"],
                  });
                }}
              >
                <option value="flat">Flat fee (testing)</option>
                <option value="distance">Distance-based pricing</option>
              </select>
            </label>
            {settings.mode === "flat" && (
              <label className="block text-sm font-medium" htmlFor="flat-fee">
                Delivery fee (UGX)
                <input
                  id="flat-fee"
                  type="number"
                  required
                  min="0"
                  step="1"
                  className={inputClass}
                  value={settings.flatFee}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      flatFee: event.target.valueAsNumber,
                    })
                  }
                />
              </label>
            )}
            <div>
              <label htmlFor="commission" className="block text-sm font-medium">
                Afrigoals delivery commission (%)
                <input
                  id="commission"
                  className={inputClass}
                  type="number"
                  required
                  min="0"
                  max="99.99"
                  step="0.01"
                  value={(settings.serviceFeeRate ?? 0.15) * 100}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      serviceFeeRate: event.target.valueAsNumber / 100,
                    })
                  }
                />
              </label>
              <p className="my-2 text-sm text-zinc-500">
                Rider payout is the delivery fee minus this commission. Saved
                rates apply to new assignments; existing payouts stay unchanged.
              </p>
              <h2 className="font-semibold">Distance-based rates</h2>
              <p className="mt-1 text-sm text-zinc-500">
                These rates take effect when distance-based pricing is selected.
                The fee uses the route distance, fuel cost, rider margin and
                traffic multiplier, with a minimum fee and rounding.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <label
                  key={key}
                  htmlFor={key}
                  className="block text-sm font-medium"
                >
                  {label}
                  <input
                    id={key}
                    type="number"
                    required
                    step="any"
                    min={
                      key === "originLat" || key === "originLng" ? undefined : 0
                    }
                    className={inputClass}
                    value={settings.pricing[key] ?? ""}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        pricing: {
                          ...settings.pricing,
                          [key]: event.target.valueAsNumber,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <Button type="submit">
              {saving ? "Savingâ€¦" : "Save delivery pricing"}
            </Button>
          </fieldset>
        </form>
      )}
    </div>
  );
}
