export async function verifyPesapalTransaction(
  _orderTrackingId: string,
): Promise<never> {
  throw new Error("Pesapal has been retired. Use IOTEC payment verification.");
}
