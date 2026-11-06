import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { buildBackendApiUrl, getBackendApiBaseUrl } from "../lib/api/backend";

afterEach(() => mock.restoreAll());

const ORIGIN = "https://api.afrigoals-store.com";
const BASE = `${ORIGIN}/api/v1`;

test("origin-only env var gets the /api/v1 prefix appended", () => {
  assert.equal(getBackendApiBaseUrl({ AFRIGOALS_API_URL: ORIGIN }), BASE);
});

test("env var that already has /api/v1 is not prefixed twice", () => {
  assert.equal(getBackendApiBaseUrl({ AFRIGOALS_API_URL: `${BASE}/` }), BASE);
  assert.equal(getBackendApiBaseUrl({ AFRIGOALS_API_URL: BASE }), BASE);
});

test("NEXT_PUBLIC_API_URL is used when AFRIGOALS_API_URL is unset", () => {
  assert.equal(getBackendApiBaseUrl({ NEXT_PUBLIC_API_URL: ORIGIN }), BASE);
});

test("falls back to localhost with the prefix when nothing is set", () => {
  assert.equal(getBackendApiBaseUrl({}), "http://localhost:8080/api/v1");
});

test("path joins onto the prefixed base", () => {
  const env = { AFRIGOALS_API_URL: ORIGIN };
  assert.equal(
    buildBackendApiUrl("/products/abc/accessories", env),
    `${BASE}/products/abc/accessories`,
  );
  assert.equal(buildBackendApiUrl("products", env), `${BASE}/products`);
});

test("a path that already starts with /api/v1 does not duplicate the prefix", () => {
  const env = { AFRIGOALS_API_URL: ORIGIN };
  assert.equal(buildBackendApiUrl("/api/v1/products", env), `${BASE}/products`);
  assert.equal(buildBackendApiUrl("/api/v1", env), BASE);
});

test("a path that merely contains api/v1 text is left alone", () => {
  const env = { AFRIGOALS_API_URL: ORIGIN };
  assert.equal(
    buildBackendApiUrl("/products/api/v1x", env),
    `${BASE}/products/api/v1x`,
  );
});
