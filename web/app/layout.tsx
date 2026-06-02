import "./globals.css"

import type { Metadata } from "next"

import Nav from "./nav"

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
        <Nav />
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </body>
    </html>
  )
}
