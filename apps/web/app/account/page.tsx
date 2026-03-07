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
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
          <h1 className="page-title text-white">Account</h1>
          <p className="page-subtitle text-slate-200">Update your profile and identity information.</p>
        </div>
      </section>

      <section className="surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">First name</span>
            <input
              className="input"
              value={profile.firstName || ""}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last name</span>
            <input
              className="input"
              value={profile.lastName || ""}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">Email</span>
            <input
              type="email"
              className="input"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">Created at: {new Date(profile.createdAt).toLocaleString()}</p>
        <button
          type="button"
          className="btn-primary mt-4 disabled:opacity-60"
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
