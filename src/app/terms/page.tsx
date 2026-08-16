import Link from 'next/link'
import Image from 'next/image'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="inline-block">
          <span className="inline-flex rounded-lg bg-white p-1">
            <Image src="/logo.png" alt="Humanverse" width={267} height={68} className="h-9 w-auto" />
          </span>
        </Link>

        <h1 className="mt-8 text-3xl font-medium text-gray-950 dark:text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: August 2026</p>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">The agreement</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              By using Humanverse, you agree to these terms. If you don&apos;t agree, don&apos;t use the product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Your account</h2>
            <ul className="mt-4 space-y-3 text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>You must be 18 or older.</li>
              <li>One account per person.</li>
              <li>Keep your credentials secure.</li>
              <li>You&apos;re responsible for what you post.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">What you can post</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Write what actually happened. Don&apos;t post:
            </p>
            <ul className="mt-3 space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Illegal content</li>
              <li>Doxxing or private personal information</li>
              <li>Targeted harassment</li>
              <li>Spam or commercial promotion</li>
              <li>Copyrighted material you don&apos;t own</li>
              <li>Sexually explicit content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Pseudonymous posting</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Pseudonymous posts are not anonymous. They are attributed to a persistent pseudonym you choose.
              We do not link pseudonymous posts to your account in the database. We cannot identify the author
              of a pseudonymous post. However, pseudonymous posts are still subject to these terms and can be
              removed for violations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Circles</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Circle posts are private to members. Circle owners can remove members. Members can leave.
              We enforce circle privacy at the database level with Row Level Security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Moderation</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              We review reports. We may remove content or suspend accounts that violate these terms.
              We&apos;ll explain what happened and what you can do next. We don&apos;t shadowban.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Your content</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              You own what you write. By posting, you give us a license to store, display, and distribute
              your content as part of Humanverse. You can delete your content at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">No warranties</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Humanverse is provided as-is. We don&apos;t guarantee uptime, accuracy, or that the product
              will meet your needs. Use at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Changes</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              We may update these terms. If changes are material, we&apos;ll notify you. Continued use
              means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-950 dark:text-white">Contact</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Questions: <a href="mailto:hello@humanverse.fun" className="underline">hello@humanverse.fun</a>
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