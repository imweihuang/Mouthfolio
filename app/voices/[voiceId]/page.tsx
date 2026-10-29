import { ResearchPage } from "../../research-page";
export const dynamic = "force-dynamic";
export default async function VoicePage({ params, searchParams }: {
  params: Promise<{ voiceId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <ResearchPage voiceId={(await params).voiceId} companyId={typeof query.company === "string" ? query.company : "anthropic"} searchParams={Promise.resolve(query)}/>;
}
