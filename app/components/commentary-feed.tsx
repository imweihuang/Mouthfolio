import Link from "next/link";
import type { AttributedView, Mention, Voice } from "../../contracts/types";
import type { Receipt } from "../../lib/contract";
import { commentaryGroups, selectCommentary } from "../../lib/commentary";
import type { CommentaryGroup, CommentaryKind, CommentaryOrder } from "../../lib/commentary";
import { companySectionUrl, journeyUrl, voiceUrl } from "../../lib/navigation";
import type { JourneyContext } from "../../lib/navigation";
import { overviewCommentary } from "../../lib/overview-commentary";
import { ResearchLink } from "./research-link";
import "./commentary.css";

export type CommentaryFeedProps = {
  views: readonly AttributedView[];
  mentions: readonly Mention[];
  voices: readonly Voice[];
  receipts: readonly Receipt[];
  companyName: string;
  context: JourneyContext;
  path: string;
  scopedVoiceId?: string;
  preview?: boolean;
};

const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-US", {
  year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
});
const kinds: { value: CommentaryKind; label: string }[] = [
  { value: "all", label: "All" }, { value: "views", label: "Views" }, { value: "mentions", label: "Mentions" },
];
const orders: { value: CommentaryOrder; label: string }[] = [
  { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" },
];

export function CommentaryFeed({ views, mentions, voices, receipts, companyName, context, path, scopedVoiceId, preview = false }: CommentaryFeedProps) {
  const groups = commentaryGroups(views, mentions, receipts);
  const voice = scopedVoiceId ?? context.commentaryVoice ?? "all";
  const kind: CommentaryKind = context.commentaryKind === "views" || context.commentaryKind === "mentions" ? context.commentaryKind : "all";
  const order: CommentaryOrder = context.commentaryOrder === "oldest" ? "oldest" : "newest";
  const selected = preview ? overviewCommentary(groups, { voice, kind }) : selectCommentary(groups, { voice, kind, order, scopedVoiceId });
  const voiceNames = new Map(voices.map(item => [item.id, item.name]));
  const activeVoices = new Set(groups.map(group => group.voiceId));
  const filterHref = (updates: Partial<JourneyContext>) => journeyUrl(path, { ...context, ...updates });
  const renderCard = (group: CommentaryGroup) => {
    const compactMention = group.views.length === 0 && !(group.receipt && "summary" in group.receipt && group.receipt.summary);
    const summary = group.receipt && "summary" in group.receipt ? group.receipt.summary : null;
    const genericTitle = group.receipt?.title === `${voiceNames.get(group.voiceId)} on ${companyName}`;
    return <li key={group.key}>
      <article className={`commentary-card ${group.views.length ? "commentary-record" : "mention-record"}${compactMention ? " commentary-compact-mention" : ""}`} data-commentary-card="" data-voice={group.voiceId} data-source-receipt={group.receiptId}>
        <div className="record-meta"><ResearchLink href={voiceUrl(group.voiceId, context)}>{voiceNames.get(group.voiceId) ?? "Voice unavailable"}</ResearchLink><time dateTime={group.publishedAt}>{dateLabel(group.publishedAt)}</time></div>
        <div className="commentary-type-labels">{group.views.length ? <span>{group.views.length} attributed {group.views.length === 1 ? "view" : "views"}</span> : null}{group.mentions.length ? <span>{group.mentions.length} {group.mentions.length === 1 ? "mention" : "mentions"}{compactMention || group.views.length ? "" : " · no attributed view in this record"}</span> : null}</div>
        {compactMention && genericTitle ? null : <h3 className="commentary-source-title">{group.receipt?.title ?? "Source title unavailable"}</h3>}
        {summary ? <div className="commentary-summary" aria-label="Record TLDR"><p className="commentary-disclosure">Record TLDR · AI-authored · AI-reviewed</p><p className="commentary-summary-text">{summary.text}</p><p className="commentary-capture">{summary.framing === "summary_from_asof_capture" ? "Based on an ASOF capture." : "Based on the source at capture time."} <span>Captured {dateLabel(summary.capture_observed_at)} UTC · summary available {dateLabel(summary.available_at)} UTC.</span></p></div> : group.views.length ? <p className="attributed-statement commentary-summary-text">{group.views[0].statement}</p> : <p className="commentary-mention"><span>Named {companyName}</span>. No attributed view in this record.</p>}
        {!preview && group.views.length ? <details className="commentary-context"><summary>{summary ? "Attributed views and context" : "Full attributed views and context"}</summary><ul className="commentary-statements">{group.views.map(view => <li key={view.version_id}><p className="attributed-statement">{view.statement}</p><dl><dt>Conditions</dt><dd>{view.conditions ?? "Not provided in this record. See the original source."}</dd><dt>Horizon</dt><dd>{view.horizon ?? "Not provided in this record. See the original source."}</dd></dl></li>)}</ul></details> : null}
        <div className="commentary-source-actions"><Link prefetch={false} scroll={false} data-receipt={group.receiptId} href={journeyUrl(path, context, group.receiptId)}>{summary ? "Read more · source & context" : group.views.length ? "Inspect supporting receipt" : "Inspect mention receipt"} <span aria-hidden="true">↗</span></Link>{group.receipt?.url ? <a href={group.receipt.url} target="_blank" rel="noreferrer noopener">Original source <span aria-hidden="true">↗</span></a> : null}</div>
      </article>
    </li>;
  };
  return <section id="commentary" className={`commentary-feed${preview ? " commentary-preview" : ""}`} aria-labelledby="commentary-title">
    <span id="views" className="commentary-anchor"/><span id="mentions" className="commentary-anchor"/>
    <div className="section-heading"><div><h2 id="commentary-title">What people are saying</h2></div>{preview ? <ResearchLink href={companySectionUrl(context, "commentary")}>All commentary <span aria-hidden="true">↗</span></ResearchLink> : null}</div>
    <p className="section-intro">{preview ? "Recent source notes, not an overall position. Summarized sources appear first." : "Dated sources and attributed views. A mention alone does not establish a stance."}</p>
    {!preview ? <div className="commentary-controls">
      {!scopedVoiceId ? <nav className="commentary-filter" aria-label="Filter commentary by voice">
        <span className="commentary-filter-label">Voice</span>
        <Link prefetch={false} scroll={false} href={filterHref({ commentaryVoice: "all" })} aria-current={voice === "all" ? "true" : undefined}>All voices</Link>
        {voices.filter(item => activeVoices.has(item.id)).map(item => <Link prefetch={false} scroll={false} key={item.id} href={filterHref({ commentaryVoice: item.id })} aria-current={voice === item.id ? "true" : undefined}>{item.name}</Link>)}
      </nav> : null}
      <div className="commentary-control-row">
        <nav className="commentary-filter" aria-label="Filter commentary by type"><span className="commentary-filter-label">Type</span>{kinds.map(item => <Link prefetch={false} scroll={false} key={item.value} href={filterHref({ commentaryKind: item.value })} aria-current={kind === item.value ? "true" : undefined}>{item.label}</Link>)}</nav>
        <nav className="commentary-filter commentary-order" aria-label="Order commentary"><span className="commentary-filter-label">Published</span>{orders.map(item => <Link prefetch={false} scroll={false} key={item.value} href={filterHref({ commentaryOrder: item.value })} aria-current={order === item.value ? "true" : undefined}>{item.label}</Link>)}</nav>
      </div>
    </div> : null}
    {!preview ? <p className="commentary-result-count" role="status">{selected.length} {selected.length === 1 ? "source card" : "source cards"}{scopedVoiceId ? ` for ${voiceNames.get(scopedVoiceId) ?? "this voice"}` : ""} · {order === "newest" ? "newest" : "oldest"} publication first{kind !== "all" ? ". Matching cards retain all their views and mentions." : "."}</p> : null}
    {selected.length ? <>
      <ol className="commentary-timeline">{selected.slice(0, 20).map(renderCard)}</ol>
      {selected.length > 20 ? <details className="commentary-more" key={JSON.stringify([voice, kind, order, context.asOf])}>
        <summary>Show {selected.length - 20} more source cards</summary>
        <ol className="commentary-timeline" start={21}>{selected.slice(20).map(renderCard)}</ol>
      </details> : null}
    </> : <p className="empty-inline">No eligible commentary matches these filters. This does not establish that the voice said nothing.</p>}
  </section>;
}
