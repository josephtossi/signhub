import Link from "next/link";
import { Card, Button } from "@signhub/ui";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-900 p-8 text-white">
        <h1 className="text-3xl font-semibold">Welcome Back</h1>
        <p className="mt-2 text-indigo-100">Send, sign, and track agreements in one place.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Pending Signatures</p>
          <p className="mt-2 text-3xl font-semibold">12</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Completed This Week</p>
          <p className="mt-2 text-3xl font-semibold">34</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Draft Envelopes</p>
          <p className="mt-2 text-3xl font-semibold">8</p>
        </Card>
      </section>
      <section className="flex gap-3">
        <Link href="/upload">
          <Button>Upload Document</Button>
        </Link>
        <Link href="/tracking/demo">
          <Button variant="secondary">Open Tracking</Button>
        </Link>
      </section>
    </div>
  );
}

