export default function PaymentCallbackLoadingPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-16">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />

        <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Verifying payment
        </h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Please wait while we confirm your payment.
        </p>
      </div>
    </main>
  );
}