import { notFound } from "next/navigation";
import { resolveAcademyCourseRef } from "@maison-doclar/academy";
import { AcademyCourseScreen } from "../../../../components/academy-course-screen";

export default async function AcademyCanonicalCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; state?: string; ok?: string; outcome?: string; percent?: string; demo?: string; result?: string }>;
}) {
  const { courseId } = await params;
  const entry = resolveAcademyCourseRef(courseId);
  if (!entry) notFound();
  return <AcademyCourseScreen courseRef={entry.id} searchParams={searchParams} />;
}
