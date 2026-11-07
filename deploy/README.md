# Contabo deployment

The actual server hostname, SSH user and domains must be supplied by the owner.
No deployment is performed by preparing these files.

## Server layout

Place the repositories side-by-side:

```
/opt/afrigoals/Afrigoals_ecommerce
/opt/afrigoals/Afrigoals_ecommerce_api
```

Install Docker Engine with Compose on the server. Point storefront and API DNS
records at that server and permit inbound TCP 80/443 and optional UDP 443.

## Configuration

In the frontend `deploy` directory, copy `.env.example` to `.env`,
`web.env.example` to `web.env`, and the API's `.env.example` to `api.env`.
Set real domains, database DSN, R2 credentials, IOTEC merchant credentials,
email sender settings, strong JWT secret and 2FA pepper. Do not commit these files.
`BASE_URL` is the public HTTPS API origin; `CORS_ALLOW_ORIGINS` is the storefront
HTTPS origin. The API remains private to the Docker network behind Caddy.

Google browser keys and Google sign-in client IDs are build arguments; they must
be supplied before building. The Google Routes server key belongs only in
`api.env`. Configure OAuth's permitted origins for the final storefront domain.

The local testing delivery mode is flat UGX 300. Review Admin > Delivery pricing
and choose production rates before making the store publicly available.

## Release checks

Run the complete frontend/backend suites and isolated release database tests.
Verify password-reset email delivery, Google login, map selection and an owner-
approved IOTEC test payment on the target environment. Automated regression tests
do not prove external email/payment providers are configured correctly.
Back up the database before starting an updated API; startup adds the vendor and
delivery-settings fields/tables through the existing AutoMigrate mechanism.

## Start

```
docker compose --env-file .env -f compose.yaml build
docker compose --env-file .env -f compose.yaml up -d --wait
docker compose --env-file .env -f compose.yaml logs --tail=100 api web caddy
```

Check `https://API_DOMAIN/health` and `https://STORE_DOMAIN/api/health`, then
verify cross-account order access is denied and rider payouts match commission.
Keep the prior images available for rollback. Roll application images back
without dropping database tables or deleting customer/payment records.
