export default function GlobalLoading() {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-3xl place-items-center">
      <div className="surface flex items-center gap-3 px-5 py-3 text-sm text-slate-600">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
        Loading workspace...
      </div>
    </div>
  );
}
