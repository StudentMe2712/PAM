import "./globals.css"

import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Personal AI Memory",
  description: "Your personal AI with long-term memory"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-neutral-950 text-neutral-100 font-mono">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <nav className="flex items-center gap-5 mb-8 text-xs uppercase tracking-widest">
            <Link href="/" className="text-lime-400 font-semibold">
              PAM
            </Link>
            <span className="text-neutral-600" title="скоро">
              Чат
            </span>
            <Link href="/history" className="text-neutral-400 hover:text-neutral-100">
              История
            </Link>
            <span className="text-neutral-600" title="скоро">
              Лектор
            </span>
          </nav>
          {children}
        </div>
      </body>
    </html>
  )
}
