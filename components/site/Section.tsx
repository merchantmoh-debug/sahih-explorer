import type { LucideIcon } from "lucide-react";

export function Section({ title, description, icon: Icon, children, id }: { title: string; description?: string; icon?: LucideIcon; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          {Icon && <Icon className="size-5 text-gold" aria-hidden />}
          {title}
        </h2>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
