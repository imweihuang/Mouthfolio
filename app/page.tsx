import { ResearchPage } from "./research-page";
export const dynamic = "force-dynamic";
export default function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ResearchPage searchParams={searchParams}/>;
}
