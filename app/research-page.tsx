import Link from "next/link";
import { createDemoAdapter, DEMO_COMPANY, INITIAL_AS_OF, LATEST_AS_OF } from "../lib/demo-adapter";
import { commentaryCoverage, headlineAmount, summaryObservations } from "../lib/observations";
import { formatAmount } from "../lib/contract";
import { readServiceResearch } from "../lib/server-research";
import { companyUrl, journeyUrl, voiceUrl } from "../lib/navigation";
import type { JourneyContext } from "../lib/navigation";
import type { MouthfolioResearch } from "../lib/contract";
import { CommentaryFeed } from "./components/commentary-feed";
import { FinancialComparisons } from "./components/financial-comparisons";
import "./components/financial-comparisons.css";
import { SourceInspector } from "./components/source-inspector";
import { ReloadPage } from "./components/reload-page";

const unavailableCopy = {
  no_record_found: "No eligible record was found for this cutoff. A source's publication date does not establish when it became available.",
  revoked: "This evidence is no longer available for display. Earlier dates do not restore access.",
  unavailable: "Research could not be loaded. This does not mean that nothing changed.",
};
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const single = (value: string | string[] | undefined, fallback: string) => value === undefined ? fallback : typeof value === "string" ? value : "invalid";

export async function ResearchPage({ searchParams, companyId = process.env.MOUTHFOLIO_SERVICE_ONLY === "1" ? "anthropic" : DEMO_COMPANY, voiceId }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>; companyId?: string; voiceId?: string;
}) {
  const params = await searchParams;
  const synthetic = companyId === DEMO_COMPANY && process.env.MOUTHFOLIO_SERVICE_ONLY !== "1";
  const asOf = single(params.asof, synthetic ? LATEST_AS_OF : new Date().toISOString());
  const window = single(params.window, "all");
  const state = single(params.state, "available");
  const receiptId = single(params.receipt, "");
  const path = voiceId ? `/voices/${encodeURIComponent(voiceId)}` : `/companies/${encodeURIComponent(companyId)}`;
  const context: JourneyContext = { companyId, asOf, window, state, receipt: receiptId,
    commentaryVoice: single(params.voice, "all"), commentaryKind: single(params.kind, "all"), commentaryOrder: single(params.order, "newest"),
  };
  const href = (receipt: string) => journeyUrl(path, context, receipt);
  let data: MouthfolioResearch | null = null;
  try {
    const query = { companyId, asOf, window: window as "all" };
    if (synthetic && ["available", "revoked", "unavailable"].includes(state)) {
      data = await createDemoAdapter(state as "available" | "revoked" | "unavailable").read(query);
    } else if (!synthetic && state === "available") {
      data = await readServiceResearch(query);
    }
  } catch { /* Failure is displayed distinctly from a valid empty response. */ }
  const ready = data?.status === "ready" ? data : null;
  const question = ready?.questions[0];
  const voice = ready?.voices.find(item => item.id === voiceId);
  const companyName = data?.company.name ?? (companyId === "anthropic" ? "Anthropic" : synthetic ? "Aster Compute" : "Company research");
  const status = data && data.status !== "ready" ? data.status : "unavailable";
  const views = ready?.views.filter(item => !voiceId || item.voice_id === voiceId) ?? [];
  const mentions = ready?.mentions.filter(item => !voiceId || item.voice_id === voiceId) ?? [];
  const voiceReceiptIds = new Set([...views, ...mentions].map(item => item.receipt_id));
  const sourceReceipts = ready?.receipts.filter(item => !voiceId || voiceReceiptIds.has(item.id)) ?? [];
  const summary = summaryObservations(ready?.observations ?? []);
  const selected = ready?.receipts.find(item => item.id === receiptId);
  // A failed request cannot establish receipt eligibility. Keep its URL for recovery
  // without opening a modal that makes the page recovery action inert.
  const showInspector = Boolean(receiptId) && (ready !== null || status !== "unavailable");
  const inspect = (id: string, label = "Inspect receipt") => <Link prefetch={false} scroll={false} data-receipt={id} href={href(id)}>{label} <span aria-hidden="true">↗</span></Link>;
  return <>
    <div className={showInspector ? "reader-shell has-inspector" : "reader-shell"}>
      <a className="skip-link" href="#research">Skip to research</a>
      <header className="topbar"><Link href={companyUrl(context)} className="brand">Mouthfolio<span className="brand-by">by ASOF</span></Link><span className="topbar-note">Company evidence. Attributed views.</span></header>
      <div className="demo-notice">{synthetic ? <><strong>Fictional demo</strong><span>All companies, voices, values and source text in this example are invented.</span></> : <><strong>ASOF Data</strong><span>Company research · only eligible evidence is displayed.</span></>}</div>
      <div className="workspace">
        <nav className="sidebar" aria-label="Research navigation"><p className="nav-label">Companies</p>
          <Link prefetch={false} href={companyUrl(context)} aria-current={!voiceId ? "page" : undefined}>{companyName}<span aria-hidden="true">↗</span></Link>
          <p className="nav-label">Voices</p>{ready?.voices.length ? ready.voices.map(item => <Link prefetch={false} key={item.id} href={voiceUrl(item.id, context)} aria-current={voiceId === item.id ? "page" : undefined}>{item.name}</Link>) : <p className="sidebar-empty">{ready || status === "no_record_found" ? "No eligible voices" : "Voices unavailable"}</p>}
          <div className="page-nav"><p className="nav-label">On this page</p>{!voiceId ? <>{question ? <a href="#question">Research question</a> : null}<a href="#financial-comparisons">Financial comparisons</a><a href="#evidence">All reported figures</a></> : null}<a href="#commentary">Views &amp; mentions</a><a href="#sources">Source receipts</a></div>
          <div className="sidebar-end"><p>Evidence, in context.</p><small>Availability dates keep each edition grounded in what was known.</small></div>
        </nav>
        <main id="research" tabIndex={-1}>
          <div className="breadcrumb"><Link prefetch={false} href={companyUrl(context)}>Companies</Link><span>/</span>{voiceId ? <><Link prefetch={false} href={companyUrl(context)}>{companyName}</Link><span>/</span><span>Voice</span></> : <span>{companyName}</span>}</div>
          <div className="page-heading"><div><p className="eyebrow">{voiceId ? "Voice profile" : "Company overview"}{synthetic ? " · fictional" : ""}</p><h1>{voiceId ? voice?.name ?? "Voice unavailable" : companyName}</h1><p className="page-intro">{voiceId ? "Follow the dated record, from an attributed view to its original source." : "Read the numbers. Follow the views. Go back to the source."}</p></div><span className="coverage-badge">{ready ? ready.coverage.state === "partial" ? "Partial coverage" : "Covered evidence" : "Coverage unavailable"}</span></div>
          <details className="context-controls" open={synthetic || undefined}><summary>Evidence available by {dateLabel(asOf)} <span>Change cutoff</span></summary>
          <form className="filters" method="get" action={`${process.env.MOUTHFOLIO_BASE_PATH ?? ""}${path}`} aria-label={synthetic ? "Demo examples" : "Research context"}>
            <input type="hidden" name="company" value={companyId}/><input type="hidden" name="window" value={window}/><input type="hidden" name="voice" value={context.commentaryVoice}/><input type="hidden" name="kind" value={context.commentaryKind}/><input type="hidden" name="order" value={context.commentaryOrder}/>{receiptId ? <input type="hidden" name="receipt" value={receiptId}/> : null}
            <label>Evidence cutoff{synthetic ? <select name="asof" defaultValue={asOf}>
              {![INITIAL_AS_OF,LATEST_AS_OF,"2026-10-25T12:00:00Z"].includes(asOf) ? <option value={asOf}>{asOf}</option> : null}
              <option value="2026-10-25T12:00:00Z">Before availability · Oct 25</option><option value={INITIAL_AS_OF}>Original edition · Oct 26</option><option value={LATEST_AS_OF}>Corrected edition · Oct 27</option>
            </select> : <input name="asof" defaultValue={asOf} aria-describedby="cutoff-help"/>}</label>
            {synthetic ? <label>Demo state<select name="state" defaultValue={state}><option value="available">Available</option><option value="revoked">Revoked</option><option value="unavailable">Service unavailable</option></select></label> : null}
            <button type="submit">Apply</button><p className="filter-note" id="cutoff-help">Publication window: {window === "all" ? "all dates" : "unsupported"}<br/>Availability cutoff in UTC</p>
          </form></details>
          {ready && (!voiceId || voice) ? <>
            <p className="summary-note" data-testid="commentary-coverage">{commentaryCoverage(views, mentions, ready.coverage.state === "partial")}</p>
            {!voiceId ? <>
              {question ? <section id="question" className="question-panel" aria-labelledby="question-title"><div className="section-kicker"><span className="eyebrow">The research question</span><span className="edition">Edition {question.edition_date}</span></div>
                <h2 id="question-title">{question.title}</h2><p className="finding">{question.finding}</p>
                {question.receipt_ids.map(id => <span className="inline-receipt" key={id}>{inspect(id, "Read question evidence")}</span>)}
              </section> : null}
              <FinancialComparisons observations={ready.observations} companyName={companyName} context={context}/>
              <section id="evidence" aria-labelledby="reported"><div className="section-heading"><div><p className="eyebrow">Business evidence</p><h2 id="reported">Latest reported figures</h2></div><span className="muted">{synthetic ? "Fictional records" : "Eligible observations"}</span></div>
                {ready.observations.length ? <><p className="summary-note">Latest reporting date: {summary[0] ? dateLabel(summary[0].period.end) : "unavailable"} · {summary.length} selected observations. All {ready.observations.length} records remain in the table.</p><div className="metric-grid">{summary.map(row => { const headline = headlineAmount(row.amount, row.unit); return <article className="metric-card" key={row.version_id}><p className="metric-label">{row.label}</p><p className="metric-value">{headline.text}</p><p className="metric-period">{row.period.label}</p>{headline.note ? <p className="summary-note">{headline.note}</p> : null}<small>{row.missing_reason ?? (row.revision_kind === "correction" ? "Corrected in the later edition" : "Reported observation")}</small>{inspect(row.receipt_id, `Inspect ${row.label.toLowerCase()}`)}</article>; })}</div>
                  <details className="evidence-table" open={synthetic || undefined}><summary>Explore all {ready.observations.length} reported figures <span>Exact values, periods and sources</span></summary><div className="table-scroll" tabIndex={0} role="region" aria-label="Reported evidence table"><table><caption>Reporting periods and source receipts · available by {dateLabel(asOf)}</caption><thead><tr><th scope="col">Measure / basis</th><th scope="col">Reported value</th><th scope="col">Period</th><th scope="col">Source</th></tr></thead><tbody>{ready.observations.map(row => <tr key={row.version_id}><th scope="row">{row.label}<details className="basis-detail"><summary>Reporting basis</summary><small>{row.basis}</small></details></th><td className="amount">{formatAmount(row.amount,row.unit)}{row.missing_reason !== null ? <small>{row.missing_reason}</small> : null}{row.revision_kind === "correction" ? <small>Corrected</small> : null}</td><td>{row.period.label}<small>{row.period.start} – {row.period.end}</small></td><td>{inspect(row.receipt_id)}</td></tr>)}</tbody></table></div></details></> : <p className="empty-inline">No eligible financial observations are available. Missing evidence is not a zero value.</p>}
              </section>
            </> : <section className="voice-context"><p className="eyebrow">Company context</p><Link prefetch={false} className="subject-link" href={companyUrl(context)}>{companyName} <span aria-hidden="true">↗</span></Link><p className="muted">Records about this company at the selected cutoff. Coverage is partial.</p></section>}
            <CommentaryFeed views={views} mentions={mentions} voices={ready.voices} receipts={ready.receipts} companyName={companyName} context={context} path={path} scopedVoiceId={voiceId}/>
            <section id="sources" aria-labelledby="sources-title"><div className="section-heading"><div><p className="eyebrow">Evidence library</p><h2 id="sources-title">Source receipts</h2></div></div><details className="source-library"><summary>Browse {sourceReceipts.length} source receipts</summary>{sourceReceipts.map(receipt => <article className="source-row" key={receipt.id}><div><h3>{receipt.title}</h3><p>Published {dateLabel(receipt.published_at)} · available {dateLabel(receipt.available_at)}</p></div>{inspect(receipt.id,"Open receipt")}</article>)}</details></section>
          </> : <section className="empty" role="status"><p className="eyebrow">Evidence status</p><h2>{ready && voiceId ? "Voice not found" : status === "no_record_found" ? "No record found" : status === "revoked" ? "Evidence revoked" : "Research unavailable"}</h2><p>{ready && voiceId ? "This voice has no eligible identity in the selected company context." : unavailableCopy[status]}</p>{!ready && status === "unavailable" ? <p><ReloadPage/></p> : null}{voiceId ? <Link prefetch={false} href={companyUrl(context)}>Return to company</Link> : null}</section>}
          <footer>{synthetic ? "Fictional research examples" : "ASOF Data research"} · evidence availability is distinct from publication time.<br/>Evidence available by {dateLabel(asOf)} · no holdings or investor scores are inferred.</footer>
        </main>
      </div>
    </div>
    {showInspector ? <SourceInspector receipt={selected} requestedId={receiptId} closeUrl={href("")} observations={ready?.observations.filter(row => row.receipt_id === receiptId) ?? []} synthetic={synthetic}/> : null}
  </>;
}
