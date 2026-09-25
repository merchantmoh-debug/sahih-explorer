"use client";

import { useTranslations } from "next-intl";
import { Download, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const STYLE_PROPS = ["fill", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "opacity", "font-family", "font-size", "font-weight"];

/** Clones the SVG with computed styles inlined, so it renders the same
 *  outside the page (theme colours come from CSS variables). */
function standalone(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll("*")];
  const dst = [clone, ...clone.querySelectorAll("*")];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const target = dst[i] as SVGElement;
    for (const p of STYLE_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) target.setAttribute(p, v);
    }
    target.removeAttribute("class");
  });
  const bg = getComputedStyle(document.body).backgroundColor;
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", "100%");
  rect.setAttribute("height", "100%");
  rect.setAttribute("fill", bg);
  clone.insertBefore(rect, clone.firstChild);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(clone);
}

function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

export function GraphExport({ svgId, fileName, caption }: { svgId: string; fileName: string; caption?: string }) {
  const t = useTranslations("Graph");

  const svgString = () => {
    const svg = document.getElementById(svgId) as SVGSVGElement | null;
    return svg ? { text: standalone(svg), w: svg.viewBox.baseVal.width, h: svg.viewBox.baseVal.height } : null;
  };

  const saveSvg = () => {
    const s = svgString();
    if (!s) return;
    const url = URL.createObjectURL(new Blob([s.text], { type: "image/svg+xml" }));
    download(url, `${fileName}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const savePng = () => {
    const s = svgString();
    if (!s) return;
    const scale = 2;
    const footer = caption ? 36 : 0;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = s.w * scale;
      canvas.height = (s.h + footer) * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
      ctx.fillRect(0, 0, s.w, s.h + footer);
      ctx.drawImage(img, 0, 0, s.w, s.h);
      if (caption) {
        ctx.fillStyle = getComputedStyle(document.body).color;
        ctx.font = "13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(caption, s.w / 2, s.h + 22);
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        download(url, `${fileName}.png`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.text)}`;
  };

  return (
    <div className="flex flex-wrap gap-2 no-print">
      <Button variant="outline" size="sm" onClick={savePng}>
        <ImageDown className="size-4" /> {t("downloadPng")}
      </Button>
      <Button variant="outline" size="sm" onClick={saveSvg}>
        <Download className="size-4" /> {t("downloadSvg")}
      </Button>
    </div>
  );
}
