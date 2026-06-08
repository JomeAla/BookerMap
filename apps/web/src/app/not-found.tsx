import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface text-text flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-extrabold tracking-tighter text-accent">404</h1>
        <p className="mt-4 text-2xl font-bold text-text">Page not found</p>
        <p className="mt-2 text-text-secondary">The page you are looking for does not exist or has been moved.</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark shadow-md transition-all"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-accent transition-colors font-medium underline underline-offset-4"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}