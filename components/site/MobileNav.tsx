"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NAV_ITEMS } from "./nav";

export function MobileNav() {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")}>
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-4 translate-y-0 sm:max-w-sm">
        <DialogTitle>{t("menu")}</DialogTitle>
        <nav className="grid gap-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-base hover:bg-accent">
              {t(item.label)}
            </Link>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
