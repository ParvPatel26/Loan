"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, type UserOut, type BankOut, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Card, CardHeader } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { RoleBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconUserPlus, IconUsers } from "@/components/icons";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function AdminUsers() {
  const { token } = useAuth();
  const { show } = useToast();
  const [users, setUsers] = useState<UserOut[]>([]);
  const [banks, setBanks] = useState<BankOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", bank_id: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadUsers(t: string) {
    setLoading(true);
    Promise.all([api.users(t), api.banks(t)])
      .then(([u, b]) => {
        setUsers(u);
        setBanks(b);
        setForm((f) => ({ ...f, bank_id: f.bank_id || b[0]?.id || "" }));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    loadUsers(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreateStaff(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const newUser = await api.createStaff(token, form);
      setUsers((u) => [...u, newUser]);
      setModalOpen(false);
      setForm({ full_name: "", email: "", password: "", bank_id: banks[0]?.id || "" });
      show(`${newUser.full_name} added as staff`, "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create staff member";
      setFormError(message);
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">All accounts across customer, staff and admin roles.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} disabled={banks.length === 0}>
          <IconUserPlus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="All users" subtitle={`${users.length} total`} />
        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <IconUsers className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No users yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(u.full_name)}
                        </div>
                        <span className="font-medium text-slate-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add staff member">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Field label="Full name">
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Alex Officer"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="alex@bank.com"
            />
          </Field>
          <Field label="Temporary password" hint="At least 8 characters — share it securely with the new hire.">
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Bank">
            <Select
              required
              value={form.bank_id}
              onChange={(e) => setForm((f) => ({ ...f, bank_id: e.target.value }))}
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add staff
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
