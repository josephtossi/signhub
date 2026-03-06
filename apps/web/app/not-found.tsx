import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you requested does not exist.</p>
      <Link href="/dashboard" className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
        Go to dashboard
      </Link>
    </div>
  );
}
