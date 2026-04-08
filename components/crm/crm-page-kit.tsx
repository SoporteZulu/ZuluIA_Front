import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CrmTone = "slate" | "blue" | "emerald" | "amber" | "rose" | "violet"

const toneStyles: Record<CrmTone, { shell: string; icon: string; value: string }> = {
  slate: {
    shell: "border-slate-200 bg-slate-50/70",
    icon: "bg-slate-900/5 text-slate-700",
    value: "text-slate-900",
  },
  blue: {
    shell: "border-sky-200 bg-sky-50/80",
    icon: "bg-sky-500/10 text-sky-700",
    value: "text-sky-700",
  },
  emerald: {
    shell: "border-emerald-200 bg-emerald-50/80",
    icon: "bg-emerald-500/10 text-emerald-700",
    value: "text-emerald-700",
  },
  amber: {
    shell: "border-amber-200 bg-amber-50/80",
    icon: "bg-amber-500/10 text-amber-700",
    value: "text-amber-700",
  },
  rose: {
    shell: "border-rose-200 bg-rose-50/80",
    icon: "bg-rose-500/10 text-rose-700",
    value: "text-rose-700",
  },
  violet: {
    shell: "border-violet-200 bg-violet-50/80",
    icon: "bg-violet-500/10 text-violet-700",
    value: "text-violet-700",
  },
}

export const crmPanelClassName =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/60"

type CrmPageHeroProps = {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function CrmPageHero({
  eyebrow = "CRM workspace",
  title,
  description,
  actions,
}: CrmPageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 shadow-sm shadow-slate-200/70 lg:p-7">
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(135deg,rgba(148,163,184,0.07),transparent)] md:block" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {eyebrow}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

type CrmStatCardProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: CrmTone
  className?: string
}

export function CrmStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  className,
}: CrmStatCardProps) {
  const toneStyle = toneStyles[tone]

  return (
    <Card
      className={cn("rounded-2xl border shadow-sm shadow-slate-200/60", toneStyle.shell, className)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <div className={cn("text-2xl font-bold tracking-tight", toneStyle.value)}>{value}</div>
            {hint ? <p className="text-xs leading-5 text-slate-500">{hint}</p> : null}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              toneStyle.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
