# Deploying Afrigoals to Contabo

Written for: the person running the server. The stack is three containers
(Postgres, Go API, Next.js storefront) behind a reverse proxy that terminates TLS.

## 1. Prepare the server

1. Install Docker Engine and the compose plugin on the Contabo VPS.
2. Clone both repos side by side:
   ```bash
   git clone <storefront-repo> Afrigoals_ecommerce
   git clone <api-repo>        Afrigoals_ecommerce_api
   cd Afrigoals_ecommerce/deploy
   ```

## 2. Create the env files (not committed)

`deploy/api.env` - copy from `Afrigoals_ecommerce_api/.env.example` and set at least:

- `JWT_SECRET`, `TWO_FA_PEPPER` - long random values
- `JWT_ISSUER`, `BASE_URL`, `CORS_ALLOW_ORIGINS=https://yourdomain.com`
- `GOOGLE_MAPS_SERVER_API` - **required**: the API prices deliveries itself, and
  orders fail with HTTP 503 without it
- `DELIVERY_SERVICE_FEE_RATE` - Afrigoals' share of each delivery fee (default `0.15`)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` - transactional email
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` - first admin account (change after first login)
- R2 storage settings if uploads are used

`deploy/web.env` - copy from `Afrigoals_ecommerce/.env.example` and set:

- `GOOGLE_MAPS_SERVER_API` (same key as the API, restricted to the Routes API)
- `NEXT_PUBLIC_GOOGLE_MAPS_API` and `NEXT_PUBLIC_GOOGLE_MAP_ID` (also passed as build args)

`deploy/.env` - compose variables:

```
POSTGRES_PASSWORD=<long random>
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API=<browser maps key>
NEXT_PUBLIC_GOOGLE_MAP_ID=<map id>
```

## 3. Build and start

```bash
docker compose --env-file .env up -d --build
docker compose logs -f api
```

The API's `AutoMigrate` creates the schema on first start.

## 4. Reverse proxy and TLS

The web container listens on `127.0.0.1:3000`. Put Caddy or Nginx in front, with
`/api/*` routed to the API and everything else to the web container. Caddy example:

```
yourdomain.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:8080
    }
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

Publish the API on `127.0.0.1:8080` if you use this, by adding
`ports: ["127.0.0.1:8080:8080"]` to the `api` service in `docker-compose.yml`.

## 5. Release checks before going live

- Sign in as a customer and place a cash-on-delivery order; confirm the fee on the
  order matches the checkout quote.
- Confirm a customer cannot open another customer's `/orders/<id>` (expect 403/404).
- Sign in as admin: the email code is requested once, then skipped on later
  password sign-ins from the same browser for 30 days.
- Open `/admin/reconciliation` and confirm totals against a sample of paid orders.
- Assign a rider to a paid order and confirm payout = fee minus the configured rate.

## 6. Updating

```bash
git -C ../../Afrigoals_ecommerce_api pull
git -C ../ pull
docker compose --env-file .env up -d --build
```

Back up the `pgdata` volume regularly, for example with `pg_dump` from the `db` container.

Note: this was prepared from the repos but **not deployed**. Actual deployment needs
the Contabo host, DNS and the secrets above.
