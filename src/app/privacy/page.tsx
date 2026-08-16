import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="inline-block">
          <span className="inline-flex rounded-lg bg-white p-1">
            <Image src="/logo.png" alt="Humanverse" width={267} height={68} className="h-9 w-auto" />
          </span>
        </Link>

        <h1 className="mt-8 text-3xl font-medium text-gray-950 dark:text-white">Privacy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: August 2026</p>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">What we collect</h2>
            <ul className="mt-4 space-y-3 text-gray-600 dark:text-gray-400">
              <li>Email address (for authentication)</li>
              <li>Display name (chosen by you)</li>
              <li>Professional context (optional, chosen by you)</li>
              <li>Avatar image (optional, uploaded by you)</li>
              <li>Pseudonym name (optional, chosen by you)</li>
              <li>Posts and replies you write</li>
              <li>Circle memberships</li>
              <li>Reactions you give</li>
              <li>Reports you submit</li>
              <li>Standard server logs (IP, user agent, timestamps)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Post visibility mechanics</h2>
            <div className="mt-4 space-y-4 text-gray-600 dark:text-gray-400">
              <div>
                <h3 className="font-medium text-gray-950 dark:text-white">Public posts</h3>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Visible to anyone on the internet</li>
                  <li>Indexed by search engines</li>
                  <li>Accessible via public URL</li>
                  <li>Included in sitemaps and OpenGraph</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-950 dark:text-white">Circle posts</h3>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Visible only to circle members</li>
                  <li>Never indexed by search engines</li>
                  <li>No public URL — direct links return 404 for non-members</li>
                  <li>Cannot be reshared outside the circle</li>
                  <li>Enforced by Row Level Security in the database</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-950 dark:text-white">Pseudonymous posts</h3>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Visible to anyone on the internet</li>
                  <li>Attributed to your pseudonym, not your account</li>
                  <li>Database stores pseudonym_id, not user_id, on the post</li>
                  <li>No internal view joins pseudonym to account</li>
                  <li>We cannot tell you who wrote a pseudonymous post</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Deletion</h2>
            <div className="mt-4 space-y-3 text-gray-600 dark:text-gray-400">
              <p>Deleting a post deletes the database row. It is not hidden behind a flag.</p>
              <p>Deleting your account removes:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Your profile</li>
                <li>All your posts (public, circle, and pseudonymous)</li>
                <li>All your replies</li>
                <li>Your pseudonym and its posting history</li>
                <li>Your circle memberships</li>
                <li>Circles you own (and their posts)</li>
                <li>Your reactions</li>
                <li>Your notifications</li>
                <li>Your reports</li>
              </ul>
              <p>We do not keep tombstones or soft-delete records.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Third parties</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              We use Supabase for database, authentication, and storage. Your data is stored on their infrastructure.
              We do not sell your data. We do not use analytics that track you across sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Contact</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Questions about this policy: <a href="mailto:hello@humanverse.fun" className="underline">hello@humanverse.fun</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <Link href="/" className="text-sm text-gray-500 hover:underline">← Back to Humanverse</Link>
        </div>
      </div>
    </div>
  )
}