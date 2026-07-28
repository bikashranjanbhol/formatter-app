import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        The page you’re looking for doesn’t exist. Try one of the tools instead.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
