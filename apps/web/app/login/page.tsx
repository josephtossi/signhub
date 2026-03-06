"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="glass rounded-2xl border border-white/60 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage agreements and signatures.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 font-medium text-white"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
        <p className="mt-4 text-sm text-slate-600">
          No account?{" "}
          <Link className="font-medium text-indigo-700" href="/signup">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

