"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, type LoanApplicationOut, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { IconFile } from "@/components/icons";

const STATUS_TONE: Record<string, "slate" | "indigo" | "emerald" | "amber" | "red"> = {
  draft: "slate",
  submitted: "slate",
  under_review: "amber",
  approved: "emerald",
  rejected: "red",
  disbursed: "indigo",
};

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function StaffApplications() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<LoanApplicationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .bankApplications(token)
      .then(setApplications)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Loan applications</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every application submitted to your bank, with its current status and, if escalated, who needs to
        approve it next.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Applications" subtitle={`${applications.length} total`} />
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <IconFile className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No applications yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Pending on</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 capitalize text-slate-600">{a.loan_type}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      ${a.requested_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS_TONE[a.status] ?? "slate"}>{statusLabel(a.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {a.pending_position_title ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
