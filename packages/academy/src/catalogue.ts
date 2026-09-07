import {
  ACA_S04A_COURSE_ID,
  ACA_S04C_COURSE_ID,
  ACA_S04D_COURSE_ID,
  ACA_S04E_COURSE_ID,
  ACADEMY_COURSE_IDS,
} from "./constants.js";
import { acaS04ACourse } from "./course-aca-s04a.js";
import { acaS04CCourse } from "./course-aca-s04c.js";
import { acaS04DCourse } from "./course-aca-s04d.js";
import { acaS04ECourse } from "./course-aca-s04e.js";
import type { AcademyCourse } from "./schemas.js";

export const ACA_S04A_COURSE_VERSION = "1.0.0" as const;
export const ACA_S04C_COURSE_VERSION = "1.0.0" as const;
export const ACA_S04D_COURSE_VERSION = "1.0.0" as const;
export const ACA_S04E_COURSE_VERSION = "1.0.0" as const;

export type AcademyCourseId = (typeof ACADEMY_COURSE_IDS)[number];

export interface AcademyCatalogueEntry {
  id: AcademyCourseId;
  slug: string;
  version: string;
  title: string;
  href: string;
}

export const ACADEMY_CATALOGUE: readonly AcademyCatalogueEntry[] = [
  {
    id: ACA_S04A_COURSE_ID,
    slug: "aca-s04a",
    version: ACA_S04A_COURSE_VERSION,
    title: acaS04ACourse.title,
    href: `/app/academy/${ACA_S04A_COURSE_ID}`,
  },
  {
    id: ACA_S04C_COURSE_ID,
    slug: "aca-s04c",
    version: ACA_S04C_COURSE_VERSION,
    title: acaS04CCourse.title,
    href: `/app/academy/${ACA_S04C_COURSE_ID}`,
  },
  {
    id: ACA_S04D_COURSE_ID,
    slug: "aca-s04d",
    version: ACA_S04D_COURSE_VERSION,
    title: acaS04DCourse.title,
    href: `/app/academy/${ACA_S04D_COURSE_ID}`,
  },
  {
    id: ACA_S04E_COURSE_ID,
    slug: "aca-s04e",
    version: ACA_S04E_COURSE_VERSION,
    title: acaS04ECourse.title,
    href: `/app/academy/${ACA_S04E_COURSE_ID}`,
  },
];

export function resolveAcademyCourseRef(value: string): AcademyCatalogueEntry | undefined {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return ACADEMY_CATALOGUE.find((item) => item.id === trimmed || item.slug === lower || item.id.toLowerCase() === lower);
}

export function academyCourseFor(id: AcademyCourseId): AcademyCourse {
  if (id === ACA_S04C_COURSE_ID) return acaS04CCourse;
  if (id === ACA_S04D_COURSE_ID) return acaS04DCourse;
  if (id === ACA_S04E_COURSE_ID) return acaS04ECourse;
  return acaS04ACourse;
}

export function applyAcademyCatalogueSeed(existing: readonly AcademyCatalogueEntry[]): AcademyCatalogueEntry[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const row of ACADEMY_CATALOGUE) {
    const prior = byId.get(row.id);
    byId.set(row.id, prior ? { ...prior, slug: row.slug, version: row.version, title: row.title, href: row.href } : { ...row });
  }
  return [...byId.values()];
}
