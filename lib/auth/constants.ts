export const AUTH_COOKIE_NAME = "afrigoals_token";

// Set after an admin passes the email code; lets that browser skip the code
// on later password sign-ins for a limited period.
export const TRUSTED_DEVICE_COOKIE_NAME = "afrigoals_trusted_device";
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
