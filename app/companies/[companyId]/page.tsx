import { ResearchPage } from "../../research-page";
export const dynamic = "force-dynamic";
export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ companyId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResearchPage companyId={(await params).companyId} searchParams={searchParams}/>;
}
