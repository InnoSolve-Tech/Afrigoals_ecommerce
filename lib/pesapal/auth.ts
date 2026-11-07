// Compatibility guard: no credentials or requests for the retired provider.
export async function getPesapalToken(): Promise<never> {
  throw new Error("Pesapal has been retired. Use IOTEC mobile money.");
}
