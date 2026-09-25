"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Code2, Copy, Flag, Quote, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  citation: string;
  arabic: string;
  english: string | null;
  url: string;
  reportUrl: string;
  jsonUrl: string;
}

export function HadithActions({ citation, arabic, english, url, reportUrl, jsonUrl }: Props) {
  const t = useTranslations("Hadith");
  const [done, setDone] = useState<string | null>(null);

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(what);
      setTimeout(() => setDone(null), 1800);
    } catch {
      window.prompt(t("copyManually"), text);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: citation, text: english ?? arabic, url });
        return;
      } catch {
        // Dismissed or unsupported: fall back to copying the link.
      }
    }
    copy("link", url);
  };

  const full = [arabic, english, `— ${citation}`, url].filter(Boolean).join("\n\n");
  const icon = (what: string, Icon: typeof Copy) => (done === what ? <Check className="size-4" /> : <Icon className="size-4" />);

  return (
    <div className="flex flex-wrap gap-2 no-print">
      <Button variant="outline" size="sm" onClick={() => copy("text", full)}>
        {icon("text", Copy)} {done === "text" ? t("copied") : t("copyText")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => copy("citation", `${citation}. ${url}`)}>
        {icon("citation", Quote)} {done === "citation" ? t("copied") : t("copyCitation")}
      </Button>
      <Button variant="outline" size="sm" onClick={share}>
        {icon("link", Share2)} {done === "link" ? t("linkCopied") : t("share")}
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <a href={reportUrl} rel="noopener" target="_blank">
          <Flag className="size-4" /> {t("report")}
        </a>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <a href={jsonUrl}>
          <Code2 className="size-4" /> {t("json")}
        </a>
      </Button>
    </div>
  );
}
