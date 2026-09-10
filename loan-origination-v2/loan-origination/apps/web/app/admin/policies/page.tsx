"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, type LendingPolicyOut, ApiError } from "@/lib/api";

export default function AdminPolicies() {
  const { token } = useAuth();
  const [policies, setPolicies] = useState<LendingPolicyOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .lendingPolicies(token)
      .then(setPolicies)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"));
  }, [token]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Lending policies</h1>
      <p className="mt-1 text-sm text-gray-500">
        Auto-approval thresholds the Decision Agent checks before approving or escalating.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Auto-approve up to</th>
              <th className="px-4 py-3 font-medium">Min credit score</th>
              <th className="px-4 py-3 font-medium">Max DTI ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {policies.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">${p.auto_approval_max_amount.toLocaleString()}</td>
                <td className="px-4 py-3">{p.min_credit_score}</td>
                <td className="px-4 py-3">{p.max_dti_ratio}</td>
              </tr>
            ))}
            {policies.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No policies yet — run the seed script.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
