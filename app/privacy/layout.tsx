import Link from "next/link";

// Public page (the Custom GPT links here), so no app navigation around it.
export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4 sm:px-6">
          <Link href="/lifeengine" className="flex items-center gap-2.5 font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 text-xs font-bold text-white">
              TH+
            </span>
            LifeEngine
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
