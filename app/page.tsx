import { Landing } from "./landing";
import { ResearchPage } from "./research-page";

export const dynamic = "force-dynamic";
const researchKeys = ["asof", "window", "state", "receipt", "company", "section", "voice", "kind", "order"];
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  // Preserve existing dated reader links. Unrelated tracking parameters do not
  // turn a landing visit into a research request.
  if (researchKeys.some(key => params[key] !== undefined)) return <ResearchPage searchParams={Promise.resolve(params)}/>;
  return <Landing/>;
}
