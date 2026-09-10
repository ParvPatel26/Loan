const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: "customer" | "staff" | "admin";
  bank_id: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export interface DashboardStats {
  total_users: number;
  total_banks: number;
  total_loan_products: number;
  total_applications: number;
}

export interface BankOut {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  status: string;
}

export interface LoanProductOut {
  id: string;
  bank_id: string;
  product_type: string;
  name: string;
  min_amount: number;
  max_amount: number;
  interest_rate_min: number;
  interest_rate_max: number;
  tenure_min_months: number;
  tenure_max_months: number;
  is_active: boolean;
}

export interface LendingPolicyOut {
  id: string;
  bank_id: string;
  product_id: string | null;
  auto_approval_max_amount: number;
  min_credit_score: number;
  max_dti_ratio: number;
}

export interface AuditLogOut {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  created_at: string;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (email: string, password: string, full_name: string) =>
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }),

  me: (token: string) => request<UserOut>("/auth/me", {}, token),

  dashboard: (token: string) => request<DashboardStats>("/admin/dashboard", {}, token),
  users: (token: string) => request<UserOut[]>("/admin/users", {}, token),
  banks: (token: string) => request<BankOut[]>("/admin/banks", {}, token),
  loanProducts: (token: string) => request<LoanProductOut[]>("/admin/loan-products", {}, token),
  lendingPolicies: (token: string) => request<LendingPolicyOut[]>("/admin/lending-policies", {}, token),
  auditLogs: (token: string) => request<AuditLogOut[]>("/admin/audit-logs", {}, token),
};

export { ApiError };
