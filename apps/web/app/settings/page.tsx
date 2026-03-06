"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Password updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-slate-200">Profile, security, notifications, and integration preferences.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-slate-500">Change your account password.</p>
        <form className="mt-4 grid gap-3 sm:max-w-lg" onSubmit={changePassword}>
          <input
            type="password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
        {success ? <p className="mt-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-slate-500">Email and webhook controls are available in the Notifications module.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-slate-500">Future-ready area for CRM, cloud drives, and workflow apps.</p>
      </section>
    </div>
  );
}
