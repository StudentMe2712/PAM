"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

export default function Nav() {
  const pathname = usePathname() || "/"
  const onChat = pathname === "/"
  const onHistory = pathname === "/history" || pathname.startsWith("/c/")
  const onSaved = pathname === "/saved"
  const onMe = pathname === "/me"

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-lime-400" />
          <span className="text-sm font-semibold tracking-wide">PAM</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-neutral-600">
            personal_ai_memory
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-xs">
          <Tab href="/" active={onChat}>
            Чат
          </Tab>
          <Tab href="/history" active={onHistory}>
            История
          </Tab>
          <Tab href="/saved" active={onSaved}>
            Избранное
          </Tab>
          <Tab href="/me" active={onMe}>
            Профиль
          </Tab>
          <Soon label="Лектор" />
        </nav>
      </div>
    </header>
  )
}

function Tab({
  href,
  active,
  children
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-3 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-neutral-800 text-lime-400"
          : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900"
      }`}>
      {children}
    </Link>
  )
}

function Soon({ label }: { label: string }) {
  return (
    <span
      title="скоро"
      className="px-3 py-1.5 rounded-md text-neutral-600 cursor-default select-none flex items-center gap-1.5">
      {label}
      <span className="text-[9px] uppercase tracking-wider border border-neutral-800 rounded px-1 py-px text-neutral-600">
        скоро
      </span>
    </span>
  )
}
