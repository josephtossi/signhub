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
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
          <h1 className="page-title text-white">Settings</h1>
          <p className="page-subtitle text-slate-200">Profile, security, notifications, and integration preferences.</p>
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-slate-500">Change your account password.</p>
        <form className="mt-4 grid gap-3 sm:max-w-lg" onSubmit={changePassword}>
          <input
            type="password"
            className="input"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="submit"
            className="btn-primary disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
        {success ? <p className="mt-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="surface p-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-slate-500">Email and webhook controls are available in the Notifications module.</p>
      </section>

      <section className="surface p-4">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-slate-500">Future-ready area for CRM, cloud drives, and workflow apps.</p>
      </section>
    </div>
  );
}
