import { AcademyCourseScreen } from "../../../../components/academy-course-screen";

export default function AcaS04FAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; state?: string; ok?: string; outcome?: string; percent?: string; demo?: string; result?: string }>;
}) {
  return <AcademyCourseScreen courseRef="ACA-S04F" searchParams={searchParams} />;
}
