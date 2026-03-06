"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-700">{error.message || "Unexpected error"}</p>
      <button
        type="button"
        className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
        onClick={reset}
      >
        Retry
      </button>
    </div>
  );
}
