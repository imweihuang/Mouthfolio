export type JourneyContext = {
  companyId: string; asOf: string; window: string; state?: string; receipt?: string;
  commentaryVoice?: string; commentaryKind?: string; commentaryOrder?: string;
};
export function journeyUrl(path: string, context: JourneyContext, receipt = context.receipt): string {
  const query = new URLSearchParams({ company: context.companyId, asof: context.asOf, window: context.window });
  if (context.state && context.state !== "available") query.set("state", context.state);
  if (context.commentaryVoice && context.commentaryVoice !== "all") query.set("voice", context.commentaryVoice);
  if (context.commentaryKind && context.commentaryKind !== "all") query.set("kind", context.commentaryKind);
  if (context.commentaryOrder && context.commentaryOrder !== "newest") query.set("order", context.commentaryOrder);
  if (receipt) query.set("receipt", receipt);
  return `${path}?${query}`;
}
export const companyUrl = (context: JourneyContext) => journeyUrl(`/companies/${encodeURIComponent(context.companyId)}`, context);
// A profile owns its speaker scope. A company-feed filter must not hide a
// different speaker after following that person's profile link.
export const voiceUrl = (voiceId: string, context: JourneyContext) => journeyUrl(`/voices/${encodeURIComponent(voiceId)}`, { ...context, commentaryVoice: undefined });
