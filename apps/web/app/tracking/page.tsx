"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DashboardData = {
  recent: { id: string; status: string; createdAt: string; document: { title: string } }[];
};

export default function TrackingIndexPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api<DashboardData>("/dashboard").then(setData).catch(() => null);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tracking</h1>
      <div className="space-y-2">
        {(data?.recent || []).map((x) => (
          <Link key={x.id} href={`/tracking/${x.id}`} className="block rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-medium">{x.document.title}</p>
            <p className="text-xs text-slate-500">{x.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

