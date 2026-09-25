"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownUp } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { NarratorPicker, type Picked } from "./NarratorPicker";

export function ConnectForm({ teacher, student }: { teacher: Picked | null; student: Picked | null }) {
  const t = useTranslations("Connect");
  const router = useRouter();
  const [a, setA] = useState<Picked | null>(student);
  const [b, setB] = useState<Picked | null>(teacher);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (a && b) router.push(`/connect?student=${a.id}&teacher=${b.id}`);
  };
  return (
    <form onSubmit={submit} className="grid items-end gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_auto_1fr_auto]">
      <NarratorPicker label={t("studentLabel")} value={a} onChange={setA} />
      <Button type="button" variant="ghost" size="icon" onClick={() => { setA(b); setB(a); }} aria-label={t("swap")} className="justify-self-center">
        <ArrowDownUp className="size-4" />
      </Button>
      <NarratorPicker label={t("teacherLabel")} value={b} onChange={setB} />
      <Button type="submit" disabled={!a || !b} className="h-11">{t("check")}</Button>
    </form>
  );
}
