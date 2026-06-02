import Link from "next/link"

type Section = {
  href: string | null
  badge: string
  title: string
  desc: string
  status: "ready" | "soon"
}

const sections: Section[] = [
  {
    href: null,
    badge: "//основное",
    title: "Чат с памятью",
    desc: "AI, который помнит всё, что вы обсуждали, и со временем строит модель тебя. Главный экран — скоро.",
    status: "soon"
  },
  {
    href: null,
    badge: "//основное",
    title: "Личный лектор",
    desc: "PDF / YouTube / статья → персональный мини-курс с тестами под твой уровень. Скоро.",
    status: "soon"
  },
  {
    href: "/history",
    badge: "//дополнительно",
    title: "Импорт истории",
    desc: "Разговоры из ChatGPT, Claude и Gemini, перехваченные расширением, — смотреть и искать.",
    status: "ready"
  }
]

export default function HomePage() {
  return (
    <main>
      <header className="border-b border-neutral-800 pb-6 mb-8">
        <div className="text-xs uppercase tracking-widest text-lime-400 mb-2">
          /// personal_ai_memory
        </div>
        <h1 className="text-3xl font-semibold">Твой личный AI с долгой памятью</h1>
        <p className="text-neutral-400 mt-2 text-sm font-sans">
          Чат, который помнит всё и строит модель тебя, и лектор, который учит под
          твой уровень. История разговоров засевает память.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}
      </div>
    </main>
  )
}

function SectionCard({ section }: { section: Section }) {
  const inner = (
    <div
      className={`h-full border rounded-sm p-4 transition-colors ${
        section.status === "ready"
          ? "border-neutral-800 hover:border-lime-400 hover:bg-neutral-900/40"
          : "border-neutral-900 opacity-60"
      }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
          {section.badge}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border rounded ${
            section.status === "ready"
              ? "text-lime-400 border-lime-400/40"
              : "text-neutral-500 border-neutral-700"
          }`}>
          {section.status === "ready" ? "открыть" : "скоро"}
        </span>
      </div>
      <div className="text-base font-semibold mb-1">{section.title}</div>
      <p className="text-sm text-neutral-400 font-sans">{section.desc}</p>
    </div>
  )

  if (section.href) {
    return (
      <Link href={section.href} className="block">
        {inner}
      </Link>
    )
  }
  return <div>{inner}</div>
}
