import { Link } from "@/i18n/routing";
import type { HadithRecord, NarratorSummary } from "@/lib/data/types";
import { TERMS } from "@/lib/vocab/terms";
import { pick } from "@/lib/l10n";

/** The Arabic text with each identified narrator linked to their page and
 *  the mention of the Prophet ﷺ marked. */
export function HadithText({ h, people, locale }: { h: HadithRecord; people: Record<string, NarratorSummary>; locale: string }) {
  const marks = [
    ...h.segs.map((s) => ({ s: s.s, e: s.e, kind: "narrator" as const, id: s.id, term: s.term })),
    ...(h.prophet ? [{ s: h.prophet[0], e: h.prophet[1], kind: "prophet" as const, id: "1", term: null }] : []),
  ].sort((a, b) => a.s - b.s);

  const parts: React.ReactNode[] = [];
  let at = 0;
  marks.forEach((m, i) => {
    if (m.s < at) return;
    if (m.s > at) parts.push(h.ar.slice(at, m.s));
    const text = h.ar.slice(m.s, m.e);
    if (m.kind === "prophet") {
      parts.push(<mark key={i} className="rounded bg-gold/15 px-0.5 text-inherit">{text}</mark>);
    } else {
      const p = people[m.id];
      const inferred = h.inferred.includes(m.id);
      const title = p ? `${p.en}${m.term ? ` · ${TERMS[m.term].ar} (${pick(TERMS[m.term].label, locale)})` : ""}` : m.id;
      parts.push(
        <Link
          key={i}
          href={`/scholar/${m.id}`}
          title={title}
          className={`rounded px-0.5 underline decoration-gold/60 decoration-2 underline-offset-[6px] transition-colors hover:bg-gold/10 ${inferred ? "decoration-dashed" : ""}`}
        >
          {text}
        </Link>,
      );
    }
    at = m.e;
  });
  if (at < h.ar.length) parts.push(h.ar.slice(at));

  return (
    <p className="hadith-ar" lang="ar" dir="rtl">
      {parts}
    </p>
  );
}
