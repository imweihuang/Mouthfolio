export type CompanySection = "overview" | "commentary" | "financials" | "sources";
export type JourneyContext = {
  companyId: string; asOf: string; window: string; state?: string; receipt?: string;
  commentaryVoice?: string; commentaryKind?: string; commentaryOrder?: string;
  section?: CompanySection;
};
export function journeyUrl(path: string, context: JourneyContext, receipt = context.receipt): string {
  const query = new URLSearchParams({ company: context.companyId, asof: context.asOf, window: context.window });
  if (context.state && context.state !== "available") query.set("state", context.state);
  if (context.commentaryVoice && context.commentaryVoice !== "all") query.set("voice", context.commentaryVoice);
  if (context.commentaryKind && context.commentaryKind !== "all") query.set("kind", context.commentaryKind);
  if (context.commentaryOrder && context.commentaryOrder !== "newest") query.set("order", context.commentaryOrder);
  if (context.section && context.section !== "overview") query.set("section", context.section);
  if (receipt) query.set("receipt", receipt);
  return `${path}?${query}`;
}
export const companySectionUrl = (context: JourneyContext, section: CompanySection) => journeyUrl(`/companies/${encodeURIComponent(context.companyId)}`, { ...context, section });
// A company entry returns to its overview without discarding evidence context.
export const companyUrl = (context: JourneyContext) => companySectionUrl(context, "overview");
// A profile owns its speaker scope and displays that speaker's commentary.
export const voiceUrl = (voiceId: string, context: JourneyContext) => journeyUrl(`/voices/${encodeURIComponent(voiceId)}`, { ...context, commentaryVoice: undefined, section: undefined });
// Latest is an unpinned request. Never turn a historical cutoff into a guessed date.
export function latestUrl(path: string, context: JourneyContext): string {
  const url = new URL(journeyUrl(path, context), "https://navigation.invalid");
  url.searchParams.delete("asof");
  return `${url.pathname}?${url.searchParams}`;
}
