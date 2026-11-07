# IOTEC payments

Online checkout uses IOTEC mobile money; cash on delivery remains available.
The integration follows NobliFi's server-side OAuth, collection and status-polling flow.

## Configure the Go API

Set `IOTEC_MOBILE_MONEY_ENABLED=true`, `IOTEC_CLIENT_ID`,
`IOTEC_CLIENT_SECRET`, and `IOTEC_WALLET_ID` for the Afrigoals merchant.
Keep these credentials server-side. Defaults are `https://pay.iotec.io` and
`https://id.iotec.io/connect/token`; the currency is UGX.
`GOOGLE_MAPS_SERVER_API` is required for authoritative delivery pricing.

Set `NEXT_PUBLIC_MOBILE_MONEY_ENABLED=true` in Next.js. This is a public feature
switch, not a payment credential. Restart the API and rebuild/restart Next.js
after configuration changes.

## Checkout and confirmation

1. Create the order with `paymentMethod: "mobile_money"` (or `"cod"`).
2. POST the payer phone to `/api/v1/orders/:id/payments/mobile-money`.
3. Approve the MTN/Airtel prompt. The pay page polls the same authenticated URL.
4. The API verifies the provider result, amount, currency, wallet and merchant
   reference before marking the order paid. A browser redirect is not proof of payment.

Pending attempts are reused; uncertain network outcomes stay in flight for
reconciliation rather than creating a second collection. Failed attempts can be
retried from the existing order payment page. Admin reconciliation is available
at `/api/v1/admin/payments/mobile-money/:id/reconcile` (POST).

Optional callbacks use `/api/v1/payments/iotec/callback` and require a matching
`X-IoTec-Callback-Secret` header configured through `IOTEC_CALLBACK_SECRET`.
Without that setup, confirmation continues through authenticated status polling.

## Retired provider

New Pesapal orders are rejected, and old checkout/callback/IPN URLs return 410.
Historical order columns are retained. Existing unpaid Pesapal orders are not
automatically recollected through IOTEC; review them before placing a new order.
No schema migration or live charge is required to install this change.
