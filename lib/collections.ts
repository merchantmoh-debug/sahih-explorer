// The six collections, their legacy names in the source data, and the
// narrator ID of each compiler.

export const COLLECTION_SLUGS = [
  "bukhari",
  "muslim",
  "abudawud",
  "tirmidhi",
  "nasai",
  "ibnmajah",
] as const;

export type CollectionSlug = (typeof COLLECTION_SLUGS)[number];

/** Sahih al-Bukhari and Sahih Muslim: accepted as authentic as whole
 *  collections, so the sources list no per-hadith gradings for them. */
export function isSahihayn(c: CollectionSlug): boolean {
  return c === "bukhari" || c === "muslim";
}

export interface CollectionInfo {
  slug: CollectionSlug;
  legacyName: string;
  compilerId: string;
  name: { en: string; ar: string; ckb: string };
}

export const COLLECTIONS: Record<CollectionSlug, CollectionInfo> = {
  bukhari: {
    slug: "bukhari",
    legacyName: "Sahih Bukhari",
    compilerId: "30001",
    name: { en: "Sahih al-Bukhari", ar: "صحيح البخاري", ckb: "سەحیحی بوخاری" },
  },
  muslim: {
    slug: "muslim",
    legacyName: "Sahih Muslim",
    compilerId: "30003",
    name: { en: "Sahih Muslim", ar: "صحيح مسلم", ckb: "سەحیحی موسلیم" },
  },
  abudawud: {
    slug: "abudawud",
    legacyName: "Sunan Abi Da'ud",
    compilerId: "30002",
    name: { en: "Sunan Abi Dawud", ar: "سنن أبي داود", ckb: "سونەنی ئەبی داود" },
  },
  tirmidhi: {
    slug: "tirmidhi",
    legacyName: "Jami' al-Tirmidhi",
    compilerId: "30005",
    name: { en: "Jami' al-Tirmidhi", ar: "جامع الترمذي", ckb: "جامیعی تیرمیزی" },
  },
  nasai: {
    slug: "nasai",
    legacyName: "Sunan an-Nasa'i",
    compilerId: "30006",
    name: { en: "Sunan an-Nasa'i", ar: "سنن النسائي", ckb: "سونەنی نەسائی" },
  },
  ibnmajah: {
    slug: "ibnmajah",
    legacyName: "Sunan Ibn Majah",
    compilerId: "30004",
    name: { en: "Sunan Ibn Majah", ar: "سنن ابن ماجه", ckb: "سونەنی ئیبن ماجە" },
  },
};

export function slugForLegacyName(name: string): CollectionSlug | undefined {
  const n = name.trim();
  return COLLECTION_SLUGS.find((s) => COLLECTIONS[s].legacyName === n);
}
