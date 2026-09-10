import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 sm:p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Loan Origination Platform
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-500">
          Agentic AI loan origination and credit assessment — customer, staff and
          admin portals.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
