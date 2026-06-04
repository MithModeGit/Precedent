import Link from 'next/link'

export default function NotFound(): React.ReactElement {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <p className="font-display text-5xl text-text-primary">404</p>
      <h1 className="mt-4 font-display text-2xl text-text-primary">Page not found</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        The page or review you are looking for does not exist, or may have been removed.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-navy-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
      >
        Return to home
      </Link>
    </main>
  )
}
