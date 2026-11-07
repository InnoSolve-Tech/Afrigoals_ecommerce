# Delivery pricing

Admins manage delivery prices at `/admin/delivery-pricing`.

- **Flat fee:** initially UGX 300 for local testing.
- **Distance-based:** route distance from the shop, base fee, fuel cost, rider margin,
  traffic multipliers, minimum fee, rounding and the long-distance override.

Settings are saved in the Go API database and apply to the next quote and new
orders without a restart. Only authenticated admins may read or update them.
Existing orders and payment attempts keep their recorded amounts.

Checkout fetches `/api/v1/delivery/quote`. Order creation uses the same stored
configuration, prices products and accessories on the server, and compares the
result with `expectedTotal` from the checkout summary. A mismatch rolls back the
order/stock transaction and returns 409 before any IOTEC request starts.

The initial mode comes from `DELIVERY_PRICING_MODE=flat` and
`DELIVERY_FLAT_FEE=300` in the Go API environment. Once an admin saves settings,
the database settings take precedence. Next.js delivery-pricing environment
variables no longer determine checkout fees.

The `delivery_settings` table is created by the API's existing startup
AutoMigrate process. Distance-based pricing requires the API's server-side
Google Routes key. Flat mode requires no external route request.
