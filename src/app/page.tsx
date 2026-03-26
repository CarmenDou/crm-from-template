import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-3">Insforge CRM MVP</h1>
      <p className="text-gray-600 mb-8">Authentication and database CRUD with the Insforge SDK.</p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/login"
          className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
