import { BASEMAP, project } from "@/lib/geo/basemap";
import { PLACE_BY_KEY } from "@/lib/vocab/places";
import { pick } from "@/lib/l10n";

export interface MapPoint { key: string; kind: "birth" | "death" | "stay" }

const KIND_CLASS = { birth: "fill-band-top", death: "fill-band-severe", stay: "fill-band-prophet" } as const;

/** Places on a schematic map (land outlines only, positions approximate). */
export function PlacesMap({ points, locale, title, legend }: { points: MapPoint[]; locale: string; title: string; legend: Record<MapPoint["kind"], string> }) {
  const placed = points
    .map((pt) => ({ pt, place: PLACE_BY_KEY.get(pt.key) }))
    .filter((x): x is { pt: MapPoint; place: NonNullable<ReturnType<typeof PLACE_BY_KEY.get>> } => Boolean(x.place));
  if (!placed.length) return null;
  const xs = placed.map(({ place }) => project(place.lon, place.lat));
  // Zoom to the points with some margin, keeping the map's aspect ratio.
  const pad = 70;
  const minX = Math.max(0, Math.min(...xs.map((p) => p[0])) - pad);
  const maxX = Math.min(BASEMAP.width, Math.max(...xs.map((p) => p[0])) + pad);
  const minY = Math.max(0, Math.min(...xs.map((p) => p[1])) - pad);
  const maxY = Math.min(BASEMAP.height, Math.max(...xs.map((p) => p[1])) + pad);
  let w = Math.max(maxX - minX, 360);
  let h = Math.max(maxY - minY, 200);
  const ratio = BASEMAP.width / BASEMAP.height;
  if (w / h > ratio) h = w / ratio; else w = h * ratio;
  const x0 = Math.max(0, Math.min(BASEMAP.width - w, (minX + maxX) / 2 - w / 2));
  const y0 = Math.max(0, Math.min(BASEMAP.height - h, (minY + maxY) / 2 - h / 2));
  const s = w / 1000;
  return (
    <figure className="space-y-2">
      <svg viewBox={`${x0} ${y0} ${w} ${h}`} className="h-auto w-full rounded-xl border bg-muted/20" role="img" aria-label={title}>
        <title>{title}</title>
        <image href="/geo/basemap.svg" x={0} y={0} width={BASEMAP.width} height={BASEMAP.height} />
        {placed.map(({ pt, place }, i) => {
          const [x, y] = xs[i];
          return (
            <g key={`${pt.kind}-${pt.key}`}>
              {place.region && <circle cx={x} cy={y} r={26 * s} className={KIND_CLASS[pt.kind]} fillOpacity={0.15} />}
              <circle cx={x} cy={y} r={6 * s} className={KIND_CLASS[pt.kind]} stroke="white" strokeWidth={1.5 * s} />
              <text x={x} y={y - 10 * s} textAnchor="middle" className="fill-foreground font-medium" style={{ fontSize: `${13 * s}px` }}>{pick(place.name, locale)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.keys(legend) as MapPoint["kind"][]).filter((k) => placed.some((p) => p.pt.kind === k)).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="4" className={KIND_CLASS[k]} /></svg>
            {legend[k]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
