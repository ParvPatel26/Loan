"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, type DashboardStats, ApiError } from "@/lib/api";

const CARDS: { key: keyof DashboardStats; label: string }[] = [
  { key: "total_users", label: "Users" },
  { key: "total_banks", label: "Banks" },
  { key: "total_loan_products", label: "Loan products" },
  { key: "total_applications", label: "Applications" },
];

export default function AdminOverview() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .dashboard(token)
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"));
  }, [token]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-gray-500">Platform-wide counts, pulled live from the database.</p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold">{stats ? stats[c.key] : "–"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
