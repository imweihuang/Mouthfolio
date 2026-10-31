import Link from "next/link";
import type { AttributedView, Mention, Voice } from "../../contracts/types";
import type { Receipt } from "../../lib/contract";
import { commentaryGroups, commentaryReading, companySummary, commentaryContextViews, selectCommentary } from "../../lib/commentary";
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
  { value: "readable", label: "Notes first" }, { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" },
];

export function CommentaryFeed({ views, mentions, voices, receipts, companyName, context, path, scopedVoiceId, preview = false }: CommentaryFeedProps) {
  const groups = commentaryGroups(views, mentions, receipts);
  const voice = scopedVoiceId ?? context.commentaryVoice ?? "all";
  const kind: CommentaryKind = context.commentaryKind === "views" || context.commentaryKind === "mentions" ? context.commentaryKind : "all";
  const order: CommentaryOrder = context.commentaryOrder === "oldest" ? "oldest" : context.commentaryOrder === "newest" ? "newest" : "readable";
  const selected = preview ? overviewCommentary(groups, { companyName, voice, kind }) : selectCommentary(groups, { voice, kind, order, scopedVoiceId, companyName });
  const readingFirst = !preview && order === "readable";
  const mainCards = readingFirst ? selected.filter(group => commentaryReading(group, companyName)) : selected.slice(0, 20);
  const archiveCards = readingFirst ? selected.filter(group => !commentaryReading(group, companyName)) : selected.slice(20);
  const voiceNames = new Map(voices.map(item => [item.id, item.name]));
  const activeVoices = new Set(groups.map(group => group.voiceId));
  const filterHref = (updates: Partial<JourneyContext>) => journeyUrl(path, { ...context, ...updates });
  const renderCard = (group: CommentaryGroup) => {
    const reading = commentaryReading(group, companyName);
    const summary = companySummary(group, companyName);
    const compactMention = !reading;
    const visibleText = reading?.text ?? group.views[0]?.statement ?? "";
    const contextViews = commentaryContextViews(group, visibleText);
    const genericTitle = group.receipt?.title === `${voiceNames.get(group.voiceId)} on ${companyName}`;
    return <li key={group.key}>
      <article className={`commentary-card ${group.views.length ? "commentary-record" : "mention-record"}${compactMention ? " commentary-compact-mention" : ""}`} data-commentary-card="" data-voice={group.voiceId} data-source-receipt={group.receiptId}>
        <div className="record-meta"><ResearchLink href={voiceUrl(group.voiceId, context)}>{voiceNames.get(group.voiceId) ?? "Voice unavailable"}</ResearchLink><time dateTime={group.publishedAt}>{dateLabel(group.publishedAt)}</time></div>
        <div className="commentary-type-labels">{group.views.length ? <span>{group.views.length} attributed {group.views.length === 1 ? "view" : "views"}</span> : null}{group.mentions.length ? <span>{group.mentions.length} {group.mentions.length === 1 ? "mention" : "mentions"}{compactMention || group.views.length ? "" : " · no attributed view in this record"}</span> : null}</div>
        {compactMention && genericTitle ? null : <h3 className="commentary-source-title">{group.receipt?.title ?? "Source title unavailable"}</h3>}
        {summary ? <div className="commentary-summary" aria-label="Summary"><p className="commentary-disclosure">Summary · AI-authored · AI-reviewed</p><p className="commentary-summary-text">{summary.text}</p><p className="commentary-capture">{summary.framing === "summary_from_asof_capture" ? "Based on an ASOF capture." : "Based on the source at capture time."} <span>Captured {dateLabel(summary.capture_observed_at)} UTC · summary available {dateLabel(summary.available_at)} UTC.</span></p></div> : reading?.kind === "excerpt" ? <div className="commentary-excerpt"><p className="commentary-disclosure">Source excerpt</p><p className="commentary-summary-text">{reading.text}</p></div> : group.views.length ? <p className={`attributed-statement${reading ? " commentary-summary-text" : ""}`}>{visibleText}</p> : <p className="commentary-mention"><span>Named {companyName}</span>. No attributed view in this record.</p>}
        {!preview && contextViews.length ? <details className="commentary-context"><summary>Attributed views and context</summary><ul className="commentary-statements">{contextViews.map(view => <li key={view.version_id}>{view.statement !== visibleText ? <p className="attributed-statement">{view.statement}</p> : null}{view.conditions || view.horizon ? <dl>{view.conditions ? <><dt>Conditions</dt><dd>{view.conditions}</dd></> : null}{view.horizon ? <><dt>Horizon</dt><dd>{view.horizon}</dd></> : null}</dl> : null}</li>)}</ul></details> : null}
        <div className="commentary-source-actions"><Link prefetch={false} scroll={false} data-receipt={group.receiptId} href={journeyUrl(path, context, group.receiptId)}>{reading ? "Source & context" : "Available source"} <span aria-hidden="true">↗</span></Link>{group.receipt?.url ? <a href={group.receipt.url} target="_blank" rel="noreferrer noopener">Original source <span aria-hidden="true">↗</span></a> : null}</div>
      </article>
    </li>;
  };
  return <section id="commentary" className={`commentary-feed${preview ? " commentary-preview" : ""}`} aria-labelledby="commentary-title">
    <span id="views" className="commentary-anchor"/><span id="mentions" className="commentary-anchor"/>
    <div className="section-heading"><div><h2 id="commentary-title">What people are saying</h2></div>{preview ? <ResearchLink href={companySectionUrl(context, "commentary")}>All commentary <span aria-hidden="true">↗</span></ResearchLink> : null}</div>
    <p className="section-intro">{preview ? "Selected company notes from the available archive. These are individual sources, not a consensus." : "Read the available notes, or browse every dated source. A mention alone does not establish a stance."}</p>
    {!preview ? <div className="commentary-controls">
      {!scopedVoiceId ? <nav className="commentary-filter" aria-label="Filter commentary by voice">
        <span className="commentary-filter-label">Voice</span>
        <Link prefetch={false} scroll={false} href={filterHref({ commentaryVoice: "all" })} aria-current={voice === "all" ? "true" : undefined}>All voices</Link>
        {voices.filter(item => activeVoices.has(item.id)).map(item => <Link prefetch={false} scroll={false} key={item.id} href={filterHref({ commentaryVoice: item.id })} aria-current={voice === item.id ? "true" : undefined}>{item.name}</Link>)}
      </nav> : null}
      <div className="commentary-control-row">
        <nav className="commentary-filter" aria-label="Filter commentary by type"><span className="commentary-filter-label">Type</span>{kinds.map(item => <Link prefetch={false} scroll={false} key={item.value} href={filterHref({ commentaryKind: item.value })} aria-current={kind === item.value ? "true" : undefined}>{item.label}</Link>)}</nav>
        <nav className="commentary-filter commentary-order" aria-label="Order commentary"><span className="commentary-filter-label">Read</span>{orders.map(item => <Link prefetch={false} scroll={false} key={item.value} href={filterHref({ commentaryOrder: item.value })} aria-current={order === item.value ? "true" : undefined}>{item.label}</Link>)}</nav>
      </div>
    </div> : null}
    {!preview ? <p className="commentary-result-count" role="status">{selected.length} {selected.length === 1 ? "source card" : "source cards"}{scopedVoiceId ? ` for ${voiceNames.get(scopedVoiceId) ?? "this voice"}` : ""} · {readingFirst ? `${mainCards.length} with readable notes · ${archiveCards.length} in the compact archive` : `${order === "newest" ? "newest" : "oldest"} publication first`}{kind !== "all" ? ". Matching cards retain all their views and mentions." : "."}</p> : null}
    {selected.length ? <>
      {mainCards.length ? <ol className="commentary-timeline">{mainCards.map(renderCard)}</ol> : <p className="empty-inline">No readable company notes are available for these filters. Archived source records remain below.</p>}
      {archiveCards.length ? <details className="commentary-more" key={JSON.stringify([voice, kind, order, context.asOf])}>
        <summary>{readingFirst ? `Browse ${archiveCards.length} more archived source cards` : `Show ${archiveCards.length} more source cards`}</summary>
        <ol className="commentary-timeline" start={mainCards.length + 1}>{archiveCards.map(renderCard)}</ol>
      </details> : null}
    </> : <p className="empty-inline">{preview ? "No readable company notes are available in this selection. Open All commentary to browse the source archive." : "No eligible commentary matches these filters. This does not establish that the voice said nothing."}</p>}
  </section>;
}
