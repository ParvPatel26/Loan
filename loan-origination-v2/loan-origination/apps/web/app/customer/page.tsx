"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, type LoanProductOut, type LoanApplicationOut, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconArrowRight, IconCheck, IconFile, IconLogout, IconSparkle } from "@/components/icons";

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

export default function CustomerPortal() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();
  const { show } = useToast();

  const [products, setProducts] = useState<LoanProductOut[] | null>(null);
  const [applications, setApplications] = useState<LoanApplicationOut[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  const [form, setForm] = useState({
    product_id: "",
    requested_amount: "",
    purpose: "",
    tenure_requested_months: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<LoanApplicationOut | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    api
      .browseProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!token) return;
    setAppsLoading(true);
    api
      .myApplications(token)
      .then(setApplications)
      .catch(() => {})
      .finally(() => setAppsLoading(false));
  }, [token]);

  const selectedProduct = products?.find((p) => p.id === form.product_id) ?? null;

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedProduct) return;
    setFormError(null);
    setSubmitting(true);
    setOutcome(null);
    try {
      const application = await api.applyForLoan(token, {
        bank_id: selectedProduct.bank_id,
        product_id: selectedProduct.id,
        requested_amount: Number(form.requested_amount),
        purpose: form.purpose || undefined,
        tenure_requested_months: Number(form.tenure_requested_months),
      });
      setOutcome(application);
      setApplications((a) => [application, ...a]);
      setForm({ product_id: "", requested_amount: "", purpose: "", tenure_requested_months: "" });
      show(
        application.status === "approved" ? "Your loan was auto-approved!" : "Application submitted for review",
        "success"
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to submit application";
      setFormError(message);
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <IconSparkle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                Welcome, {user.full_name.split(" ")[0]}
              </h1>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>
            <IconLogout className="h-4 w-4" />
            Log out
          </Button>
        </div>

        <Card className="mt-8 flex flex-col items-start gap-4 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <IconSparkle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Prefer to just talk it through?</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Our loan assistant asks the questions one at a time, checks your documents, and submits the
                application for you — no form required.
              </p>
            </div>
          </div>
          <Link href="/customer/chat" className="shrink-0">
            <Button>
              Chat with the assistant
              <IconArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <h2 className="text-sm font-semibold text-slate-900">Or apply with a quick form</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick a product and tell us how much you need — we&apos;ll check it against the bank&apos;s
              policy right away.
            </p>

            {outcome && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {outcome.status === "approved" ? (
                    <>Auto-approved for ${outcome.requested_amount.toLocaleString()}.</>
                  ) : (
                    <>
                      Submitted — now under review
                      {outcome.pending_position_title ? ` by the ${outcome.pending_position_title}` : ""}.
                    </>
                  )}
                </span>
              </div>
            )}

            <form onSubmit={handleApply} className="mt-4 space-y-4">
              <Field label="Loan product">
                {products === null ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    required
                    value={form.product_id}
                    onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                  >
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.min_amount.toLocaleString()}–${p.max_amount.toLocaleString()})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                label="Amount requested ($)"
                hint={
                  selectedProduct
                    ? `Between $${selectedProduct.min_amount.toLocaleString()} and $${selectedProduct.max_amount.toLocaleString()}`
                    : undefined
                }
              >
                <Input
                  type="number"
                  required
                  min={selectedProduct?.min_amount ?? 0}
                  max={selectedProduct?.max_amount ?? undefined}
                  value={form.requested_amount}
                  onChange={(e) => setForm((f) => ({ ...f, requested_amount: e.target.value }))}
                  placeholder="15000"
                />
              </Field>

              <Field
                label="Tenure (months)"
                hint={
                  selectedProduct
                    ? `Between ${selectedProduct.tenure_min_months} and ${selectedProduct.tenure_max_months} months`
                    : undefined
                }
              >
                <Input
                  type="number"
                  required
                  min={selectedProduct?.tenure_min_months ?? 1}
                  max={selectedProduct?.tenure_max_months ?? undefined}
                  value={form.tenure_requested_months}
                  onChange={(e) => setForm((f) => ({ ...f, tenure_requested_months: e.target.value }))}
                  placeholder="24"
                />
              </Field>

              <Field label="Purpose (optional)">
                <Input
                  value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  placeholder="Debt consolidation, renovation, etc."
                />
              </Field>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <Button type="submit" loading={submitting} disabled={!selectedProduct} className="w-full">
                Submit application
                <IconArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader title="My applications" subtitle={`${applications.length} total`} />
            {appsLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <IconFile className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No applications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {applications.map((a) => (
                  <li key={a.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize text-slate-900">{a.loan_type} loan</span>
                      <Badge tone={STATUS_TONE[a.status] ?? "slate"}>{statusLabel(a.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">${a.requested_amount.toLocaleString()}</p>
                    {a.pending_position_title && (
                      <p className="mt-0.5 text-xs text-slate-400">Pending {a.pending_position_title} approval</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
