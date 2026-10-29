export type JourneyContext = { companyId: string; asOf: string; window: string; state?: string; receipt?: string };
export function journeyUrl(path: string, context: JourneyContext, receipt = context.receipt): string {
  const query = new URLSearchParams({ company: context.companyId, asof: context.asOf, window: context.window });
  if (context.state && context.state !== "available") query.set("state", context.state);
  if (receipt) query.set("receipt", receipt);
  return `${path}?${query}`;
}
export const companyUrl = (context: JourneyContext) => journeyUrl(`/companies/${encodeURIComponent(context.companyId)}`, context);
export const voiceUrl = (voiceId: string, context: JourneyContext) => journeyUrl(`/voices/${encodeURIComponent(voiceId)}`, context);
