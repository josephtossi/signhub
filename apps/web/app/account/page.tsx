"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Profile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
};

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api<Profile>("/users/me/profile")
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load account"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api<Profile>("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email
        })
      });
      setProfile(updated);
      setSuccess("Account updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading account...</p>;
  if (!profile) return <p className="text-sm text-red-600">{error || "Unable to load account"}</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-slate-200">Update your profile and identity information.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">First name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={profile.firstName || ""}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={profile.lastName || ""}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">Email</span>
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">Created at: {new Date(profile.createdAt).toLocaleString()}</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {success ? <p className="mt-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
