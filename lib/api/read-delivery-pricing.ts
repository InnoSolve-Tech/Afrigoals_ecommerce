export async function readDeliveryPricing(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : response.status === 404
          ? "Delivery pricing is not available on this server. Please ask the administrator to check the deployment."
          : "Could not load or save delivery pricing. Please try again.",
    );
  if (
    !data ||
    !["flat", "distance"].includes(data.mode) ||
    typeof data.flatFee !== "number" ||
    !Number.isFinite(data.flatFee) ||
    typeof data.serviceFeeRate !== "number" ||
    !Number.isFinite(data.serviceFeeRate) ||
    !data.pricing ||
    typeof data.pricing !== "object" ||
    Array.isArray(data.pricing)
  )
    throw new Error(
      "The server returned incomplete delivery settings. Reload settings before making changes.",
    );
  return data;
}
