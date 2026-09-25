import { useTranslations } from "next-intl";
import { AlertTriangle, Info, Link2, Users } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { ChainNote, NarratorSummary } from "@/lib/data/types";
import { GRADES, type GradeKey } from "@/lib/vocab/grades";
import { displayName, formatPlain, pick } from "@/lib/l10n";

type Group = "narrators" | "links" | "chain";

const GROUP_OF: Record<ChainNote["kind"], Group> = {
  grade: "narrators", "no-grade": "narrators", unidentified: "narrators",
  "gen-gap": "links", "gen-order": "links", "death-gap": "links", "death-order": "links", unattested: "links",
  "hidden-narrators": "links", "name-differs": "links", inferred: "links",
  "no-chain": "chain", branched: "chain", "uncertain-branch": "chain", "not-marfu": "chain", "source-not-companion": "chain", "follow-up": "chain",
};

const ICON: Record<Group, typeof Info> = { narrators: Users, links: Link2, chain: Info };

export function ChainNotes({ notes, people, locale }: { notes: ChainNote[]; people: Record<string, NarratorSummary>; locale: string }) {
  const t = useTranslations("Notes");
  const plain = (v: unknown) => formatPlain(Number(v), locale);
  const name = (id: string) => (people[id] ? displayName(people[id], locale) : t("unknownNarrator", { id }));

  const text = (n: ChainNote): string => {
    const [a, b] = n.ids;
    const d = n.data ?? {};
    switch (n.kind) {
      case "grade": return t("grade", { name: name(a), grade: pick(GRADES[d.grade as GradeKey].label, locale) });
      case "no-grade": return t("noGrade", { name: name(a) });
      case "unidentified": return t("unidentified", { id: a });
      case "gen-gap": return t("genGap", { teacher: name(a), student: name(b), teacherGen: plain(d.teacherGen), studentGen: plain(d.studentGen) });
      case "gen-order": return t("genOrder", { teacher: name(a), student: name(b), teacherGen: plain(d.teacherGen), studentGen: plain(d.studentGen) });
      case "death-gap": return t("deathGap", { teacher: name(a), student: name(b), teacherDeath: plain(d.teacherDeath), studentDeath: plain(d.studentDeath), years: plain(Number(d.studentDeath) - Number(d.teacherDeath)) });
      case "death-order": return t("deathOrder", { teacher: name(a), student: name(b), teacherDeath: plain(d.teacherDeath), studentDeath: plain(d.studentDeath) });
      case "unattested": return t("unattested", { teacher: name(a), student: name(b) });
      case "hidden-narrators": return t("hidden", { teacher: name(a), student: name(b), names: String(d.names ?? "") });
      case "name-differs": return t("nameDiffers", { name: name(a), alt: name(b), text: String(d.text ?? "") });
      case "inferred": return t("inferred", { names: n.ids.map(name).join("، ") });
      case "no-chain": return t("noChain");
      case "branched": return t("branched");
      case "uncertain-branch": return t("uncertainBranch");
      case "not-marfu": return t("notMarfu", { name: name(a) });
      case "source-not-companion": return t("sourceNotCompanion", { name: name(a) });
      case "follow-up": return t("followUp");
    }
  };

  const grouped = new Map<Group, string[]>();
  for (const n of notes) {
    const g = GROUP_OF[n.kind];
    const list = grouped.get(g) ?? [];
    const s = text(n);
    if (!list.includes(s)) list.push(s);
    grouped.set(g, list);
  }

  return (
    <div className="space-y-4">
      <p className="flex gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        <span>
          {t("disclaimer")} <Link href="/glossary#notes" className="underline">{t("learnMore")}</Link>
        </span>
      </p>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        (["chain", "narrators", "links"] as Group[]).filter((g) => grouped.has(g)).map((g) => {
          const Icon = ICON[g];
          return (
            <section key={g} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                {t(`group.${g}`)}
              </h3>
              <ul className="space-y-1.5 text-sm leading-relaxed">
                {grouped.get(g)!.map((s) => (
                  <li key={s} className="rounded-md bg-muted/50 px-3 py-2">{s}</li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
