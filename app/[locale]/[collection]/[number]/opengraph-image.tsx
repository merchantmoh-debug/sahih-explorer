import { ImageResponse } from "next/og";
import { COLLECTIONS } from "@/lib/collections";
import { getHadith, isCollectionSlug, summaries } from "@/lib/data/server";

// Link-preview image: the reference and its chain. English only, because the
// image renderer cannot shape Arabic script.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Hadith and its chain of narrators";

export default async function Image({ params }: { params: Promise<{ collection: string; number: string }> }) {
  const { collection, number } = await params;
  const h = isCollectionSlug(collection) ? getHadith(collection, decodeURIComponent(number)) : null;
  const title = h ? `${COLLECTIONS[h.c].name.en} ${h.ref.std ?? h.slug}` : "Sahih Explorer";
  const people = h ? summaries(h.graph.nodes) : {};
  const chain = h ? h.graph.nodes.map((id) => (id === "1" ? "The Prophet, peace be upon him" : people[id]?.en ?? "Unidentified narrator")) : [];
  const shown = chain.length > 8 ? [...chain.slice(0, 4), "…", ...chain.slice(-3)] : chain;
  const text = h?.en ? (h.en.length > 220 ? `${h.en.slice(0, 217)}…` : h.en) : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf7f0", color: "#2a241c", padding: 56, gap: 48, fontSize: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 26, color: "#9a7b2c" }}>Sahih Explorer</div>
            <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
            {text && <div style={{ fontSize: 26, lineHeight: 1.4, color: "#5c5244" }}>{text}</div>}
          </div>
          <div style={{ fontSize: 22, color: "#7a6f60" }}>The chain of narrators, from the source to the compiler</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 400, gap: 10, justifyContent: "center" }}>
          {shown.map((name, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: i === 0 ? "#c9a227" : "#3f8f6b" }} />
              <div style={{ fontSize: 22, padding: "8px 14px", borderRadius: 12, border: "2px solid #e6dcc6", background: "#ffffff", display: "flex" }}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
