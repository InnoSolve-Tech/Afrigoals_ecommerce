// lib/delivery/calculate-delivery-fee.ts

import { DELIVERY_CONFIG } from "./config";

export interface DeliveryQuote {
  distanceMeters: number;
  distanceKm: number;
  fee: number;
  currency: "UGX";
  breakdown: {
    baseFee: number;
    fuelCostPerKm: number;
    riderMarginPerKm: number;
    ratePerKm: number;
    trafficMultiplier: number;
    trafficPeriod: "peak" | "moderate" | "off-peak";
    petrolPricePerLitre: number;
    longDistanceThresholdKm: number;
    longDistanceFlatFee: number;
    longDistanceApplied: boolean;
  };
}

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return value;
}

const LONG_DISTANCE_DELIVERY_THRESHOLD_KM = getEnvNumber(
  "LONG_DISTANCE_DELIVERY_THRESHOLD_KM",
  35,
);

const LONG_DISTANCE_DELIVERY_FEE_UGX = getEnvNumber(
  "LONG_DISTANCE_DELIVERY_FEE_UGX",
  10000,
);

function validateCoordinate(lat: number, lng: number) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("Invalid latitude");
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error("Invalid longitude");
  }
}

function getTrafficFactor(): {
  multiplier: number;
  period: "peak" | "moderate" | "off-peak";
} {
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" }),
  ).getHours();

  const { peak, moderate } = DELIVERY_CONFIG.traffic;

  const inPeak = peak.hours.some(
    ([start, end]) => hour >= start && hour <= end,
  );

  if (inPeak) {
    return {
      multiplier: peak.multiplier,
      period: "peak",
    };
  }

  const inModerate = moderate.hours.some(
    ([start, end]) => hour >= start && hour <= end,
  );

  if (inModerate) {
    return {
      multiplier: moderate.multiplier,
      period: "moderate",
    };
  }

  return {
    multiplier: DELIVERY_CONFIG.traffic.offPeak.multiplier,
    period: "off-peak",
  };
}

function calcRatePerKm(): number {
  const {
    petrolPerLitre,
    motorcycleKmPerLitre,
    roundTripFactor,
    riderMarginPerKm,
  } = DELIVERY_CONFIG.fuel;

  const fuelCostPerKm =
    (petrolPerLitre / motorcycleKmPerLitre) * roundTripFactor;

  return fuelCostPerKm + riderMarginPerKm;
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

export async function calculateDeliveryFee(
  destinationLat: number,
  destinationLng: number,
): Promise<DeliveryQuote> {
  validateCoordinate(destinationLat, destinationLng);

  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_API ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;

  if (!apiKey) {
    throw new Error("Google Maps API key is missing");
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: DELIVERY_CONFIG.origin.lat,
              longitude: DELIVERY_CONFIG.origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destinationLat,
              longitude: destinationLng,
            },
          },
        },
        travelMode: "TWO_WHEELER",
        routingPreference: "TRAFFIC_AWARE",
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to calculate delivery route: ${errorText}`);
  }

  const data = await response.json();
  const distanceMeters = data?.routes?.[0]?.distanceMeters;

  if (!distanceMeters || typeof distanceMeters !== "number") {
    throw new Error("Google Maps did not return a valid route distance");
  }

  const distanceKm = distanceMeters / 1000;

  const { multiplier: trafficMultiplier, period: trafficPeriod } =
    getTrafficFactor();

  const fuelCostPerKm = Math.round(
    (DELIVERY_CONFIG.fuel.petrolPerLitre /
      DELIVERY_CONFIG.fuel.motorcycleKmPerLitre) *
      DELIVERY_CONFIG.fuel.roundTripFactor,
  );

  const ratePerKm = calcRatePerKm();

  const rawFee =
    (DELIVERY_CONFIG.pricing.baseFee + distanceKm * ratePerKm) *
    trafficMultiplier;

  const normalFee = Math.max(
    DELIVERY_CONFIG.pricing.minimumFee,
    roundToNearest(rawFee, DELIVERY_CONFIG.pricing.roundToNearest),
  );

  const longDistanceApplied =
    distanceKm > LONG_DISTANCE_DELIVERY_THRESHOLD_KM;

  const fee = longDistanceApplied
    ? LONG_DISTANCE_DELIVERY_FEE_UGX
    : normalFee;

  return {
    distanceMeters: Math.round(distanceMeters),
    distanceKm: Number(distanceKm.toFixed(2)),
    fee,
    currency: "UGX",
    breakdown: {
      baseFee: DELIVERY_CONFIG.pricing.baseFee,
      fuelCostPerKm,
      riderMarginPerKm: DELIVERY_CONFIG.fuel.riderMarginPerKm,
      ratePerKm: Math.round(ratePerKm),
      trafficMultiplier,
      trafficPeriod,
      petrolPricePerLitre: DELIVERY_CONFIG.fuel.petrolPerLitre,
      longDistanceThresholdKm: LONG_DISTANCE_DELIVERY_THRESHOLD_KM,
      longDistanceFlatFee: LONG_DISTANCE_DELIVERY_FEE_UGX,
      longDistanceApplied,
    },
  };
}