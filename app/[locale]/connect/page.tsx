import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDown, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { connect } from "@/lib/data/connect";
import { getNarratorSummary, summaries } from "@/lib/data/server";
import { displayName, formatPlain } from "@/lib/l10n";
import { ConnectForm } from "@/components/connect/ConnectForm";
import { NarratorRow } from "@/components/narrator/NarratorRow";
import { pageAlternates } from "@/lib/site";

interface Props { params: Promise<{ locale: string }>; searchParams: Promise<{ teacher?: string; student?: string }> }

const EXAMPLES = [
  { student: "20001", teacher: "11014" },
  { student: "11013", teacher: "19" },
  { student: "20005", teacher: "13" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Connect" });
  return { title: t("title"), description: t("description"), alternates: pageAlternates(locale, "/connect") };
}

export default async function ConnectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Connect");
  const teacherS = sp.teacher ? getNarratorSummary(sp.teacher) : undefined;
  const studentS = sp.student ? getNarratorSummary(sp.student) : undefined;
  const result = teacherS && studentS ? connect(teacherS.id, studentS.id) : null;
  const people = result ? summaries(result.paths.flat()) : {};
  const name = (id: string) => {
    const s = getNarratorSummary(id);
    return s ? displayName(s, locale) : id;
  };

  let verdict: "direct" | "listed" | "indirect" | "reverse" | "none" = "none";
  if (result?.direct) verdict = result.direct.n > 0 ? "direct" : "listed";
  else if (result?.reverse) verdict = "reverse";
  else if (result?.paths.length) verdict = "indirect";

  let dates: string | null = null;
  if (result && result.deathGap !== null) {
    if (result.deathGap > 120 || result.deathGap < -80) dates = t("datesFar", { years: formatPlain(Math.abs(result.deathGap), locale) });
    else if (result.generationGap !== null && result.generationGap >= 0 && result.generationGap <= 4 && result.deathGap >= -20) dates = t("datesConsistent");
    else dates = t("datesOpen");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>

      <ConnectForm
        teacher={teacherS ? { id: teacherS.id, label: displayName(teacherS, locale) } : null}
        student={studentS ? { id: studentS.id, label: displayName(studentS, locale) } : null}
      />

      {!result && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t("examples")}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {EXAMPLES.map((e) => (
              <li key={`${e.student}-${e.teacher}`}>
                <Link href={`/connect?student=${e.student}&teacher=${e.teacher}`} className="inline-block rounded-full border px-3 py-1 hover:bg-accent">
                  {t("example", { student: name(e.student), teacher: name(e.teacher) })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <section className="space-y-6">
          <div className="flex gap-3 rounded-2xl border bg-card p-5">
            {verdict === "direct" || verdict === "listed" ? <CheckCircle2 className="size-6 shrink-0 text-band-top" /> : verdict === "none" ? <XCircle className="size-6 shrink-0 text-band-severe" /> : <CircleHelp className="size-6 shrink-0 text-band-fair" />}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{t(`verdict.${verdict}`, { student: displayName(result.student, locale), teacher: displayName(result.teacher, locale), count: result.direct?.n ?? result.reverse?.n ?? 0 })}</h2>
              {result.direct?.listed && verdict === "direct" && <p className="text-sm text-muted-foreground">{t("alsoListed")}</p>}
              {dates && <p className="text-sm text-muted-foreground">{dates}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1"><h3 className="text-sm font-semibold">{t("teacherLabel")}</h3><div className="rounded-xl border p-1"><NarratorRow n={result.teacher} locale={locale} /></div></div>
            <div className="space-y-1"><h3 className="text-sm font-semibold">{t("studentLabel")}</h3><div className="rounded-xl border p-1"><NarratorRow n={result.student} locale={locale} /></div></div>
          </div>

          {verdict === "indirect" && (
            <div className="space-y-3">
              <h3 className="font-semibold">{t("paths", { count: result.paths.length })}</h3>
              <p className="text-sm text-muted-foreground">{t("pathsHelp")}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {result.paths.map((path, i) => (
                  <ol key={i} className="space-y-1 rounded-xl border p-2">
                    {path.map((id, j) => (
                      <li key={`${id}-${j}`}>
                        {people[id] && <NarratorRow n={people[id]} locale={locale} />}
                        {j < path.length - 1 && <ArrowDown className="mx-auto size-4 text-muted-foreground" aria-hidden />}
                      </li>
                    ))}
                  </ol>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("caveat")}</p>
        </section>
      )}
    </div>
  );
}
