"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStaff } from "@/lib/staff-context";
import { api, type LendingPolicyOut, type LoanProductOut, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Card, CardHeader } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconLock, IconShield } from "@/components/icons";

const EMPTY_FORM = { product_id: "", auto_approval_max_amount: "", min_credit_score: "", max_dti_ratio: "" };

export default function StaffPolicies() {
  const { token } = useAuth();
  const { position, loading: staffLoading } = useStaff();
  const { show } = useToast();
  const [policies, setPolicies] = useState<LendingPolicyOut[]>([]);
  const [products, setProducts] = useState<LoanProductOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.bankPolicies(token), api.bankProducts(token)])
      .then(([pol, prod]) => {
        setPolicies(pol);
        setProducts(prod);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  function productName(id: string | null) {
    if (!id) return "All products (bank-wide default)";
    return products.find((p) => p.id === id)?.name ?? "Unknown product";
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const newPolicy = await api.createBankPolicy(token, {
        product_id: form.product_id || null,
        auto_approval_max_amount: Number(form.auto_approval_max_amount),
        min_credit_score: Number(form.min_credit_score),
        max_dti_ratio: Number(form.max_dti_ratio),
      });
      setPolicies((p) => [...p, newPolicy]);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      show("Lending policy added", "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create policy";
      setFormError(message);
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!staffLoading && position && !position.can_manage_products) {
    return (
      <Card className="mt-6 flex flex-col items-center gap-2 p-10 text-center">
        <IconLock className="h-8 w-8 text-slate-300" />
        <h1 className="text-sm font-semibold text-slate-900">Restricted</h1>
        <p className="text-sm text-slate-400">
          Your position ({position.title}) doesn&apos;t include policy management.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lending policies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-approval thresholds the decision routing checks before approving or escalating.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <IconShield className="h-4 w-4" />
          Add policy
        </Button>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Active policies" />
        {loading ? (
          <TableSkeleton rows={2} cols={4} />
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <IconShield className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No policies yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Applies to</th>
                  <th className="px-5 py-3 font-medium">Auto-approve up to</th>
                  <th className="px-5 py-3 font-medium">Min credit score</th>
                  <th className="px-5 py-3 font-medium">Max DTI ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-slate-600">{productName(p.product_id)}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      ${p.auto_approval_max_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{p.min_credit_score}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.max_dti_ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add lending policy">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Product" hint="Leave as bank-wide to apply when no product-specific policy matches.">
            <Select
              value={form.product_id}
              onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
            >
              <option value="">All products (bank-wide default)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Auto-approve up to ($)">
            <Input
              type="number"
              required
              min={0}
              value={form.auto_approval_max_amount}
              onChange={(e) => setForm((f) => ({ ...f, auto_approval_max_amount: e.target.value }))}
              placeholder="10000"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min credit score">
              <Input
                type="number"
                required
                min={300}
                max={900}
                value={form.min_credit_score}
                onChange={(e) => setForm((f) => ({ ...f, min_credit_score: e.target.value }))}
                placeholder="650"
              />
            </Field>
            <Field label="Max DTI ratio">
              <Input
                type="number"
                required
                step="0.01"
                min={0}
                max={1}
                value={form.max_dti_ratio}
                onChange={(e) => setForm((f) => ({ ...f, max_dti_ratio: e.target.value }))}
                placeholder="0.4"
              />
            </Field>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add policy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
