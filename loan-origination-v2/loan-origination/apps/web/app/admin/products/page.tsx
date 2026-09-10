"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, type LoanProductOut, ApiError } from "@/lib/api";

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState<LoanProductOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .loanProducts(token)
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"));
  }, [token]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Loan products</h1>
      <p className="mt-1 text-sm text-gray-500">Products available across banks on the platform.</p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">{p.name}</h2>
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize">
                {p.product_type}
              </span>
            </div>
            <dl className="mt-3 space-y-1 text-sm text-gray-500">
              <div className="flex justify-between">
                <dt>Amount</dt>
                <dd>
                  ${p.min_amount.toLocaleString()} – ${p.max_amount.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Rate</dt>
                <dd>
                  {p.interest_rate_min}% – {p.interest_rate_max}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Tenure</dt>
                <dd>
                  {p.tenure_min_months}–{p.tenure_max_months} mo
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {products.length === 0 && !error && (
          <p className="text-sm text-gray-400">No products yet — run the seed script.</p>
        )}
      </div>
    </div>
  );
}
