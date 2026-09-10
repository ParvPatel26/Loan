"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function CustomerPortal() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Welcome, {user.full_name}</h1>
        <button onClick={logout} className="text-sm text-red-600 hover:underline">
          Log out
        </button>
      </div>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        The conversational loan application flow (chat intake, document upload, status
        tracking) is built in a later phase. You're logged in as a customer — this is
        the landing point the login redirect sends you to.
      </div>
    </main>
  );
}
