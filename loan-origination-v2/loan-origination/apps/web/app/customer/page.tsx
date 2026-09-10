"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconSparkle } from "@/components/icons";

export default function CustomerPortal() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome, {user.full_name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <IconSparkle className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-slate-900">Your application journey is coming soon</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            The conversational loan application flow — chat intake, document upload, and status tracking —
            is built in a later phase. You&apos;re signed in as a customer, so this is where it will live.
          </p>
        </Card>
      </div>
    </main>
  );
}
