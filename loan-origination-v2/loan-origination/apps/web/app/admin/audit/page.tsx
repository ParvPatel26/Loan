"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, type AuditLogOut, ApiError } from "@/lib/api";

export default function AdminAudit() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .auditLogs(token)
      .then(setLogs)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"));
  }, [token]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-gray-500">Most recent 100 recorded actions.</p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 text-gray-500">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {l.entity_type} <span className="text-gray-400">#{l.entity_id.slice(0, 8)}</span>
                </td>
                <td className="px-4 py-3">{l.action}</td>
              </tr>
            ))}
            {logs.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No audit entries yet — they'll appear as the platform is used.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
