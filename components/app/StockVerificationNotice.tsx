"use client";

export function StockVerificationNotice({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="m-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
    >
      <p>{error}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-2 font-semibold underline underline-offset-2"
      >
        Retry stock check
      </button>
    </div>
  );
}
