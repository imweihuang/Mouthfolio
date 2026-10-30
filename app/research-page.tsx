import Link from "next/link";
import { createDemoAdapter, DEMO_COMPANY, INITIAL_AS_OF, LATEST_AS_OF } from "../lib/demo-adapter";
import { commentaryCoverage, headlineAmount, summaryObservations } from "../lib/observations";
import { formatAmount } from "../lib/contract";
import { readServiceResearch } from "../lib/server-research";
import { companyUrl, journeyUrl, voiceUrl } from "../lib/navigation";
import type { JourneyContext } from "../lib/navigation";
import type { MouthfolioResearch } from "../lib/contract";
import { RecordTldr } from "./components/record-tldr";
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
  const context: JourneyContext = { companyId, asOf, window, state, receipt: receiptId };
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
  const summary = summaryObservations(ready?.observations ?? []);
  const selected = ready?.receipts.find(item => item.id === receiptId);
  const inspect = (id: string, label = "Inspect receipt") => <Link prefetch={false} scroll={false} data-receipt={id} href={href(id)}>{label} <span aria-hidden="true">↗</span></Link>;
  return <>
    <div className={receiptId ? "reader-shell has-inspector" : "reader-shell"}>
      <a className="skip-link" href="#research">Skip to research</a>
      <header className="topbar"><Link href={companyUrl(context)} className="brand">Mouthfolio<span className="brand-by">by ASOF</span></Link><span className="topbar-note">Company evidence. Attributed views.</span></header>
      <div className="demo-notice">{synthetic ? <><strong>Fictional demo</strong><span>All companies, voices, values and source text in this example are invented.</span></> : <><strong>ASOF Data</strong><span>Company research · only eligible evidence is displayed.</span></>}</div>
      <div className="workspace">
        <nav className="sidebar" aria-label="Research navigation"><p className="nav-label">Companies</p>
          <Link prefetch={false} href={companyUrl(context)} aria-current={!voiceId ? "page" : undefined}>{companyName}<span aria-hidden="true">↗</span></Link>
          <p className="nav-label">Voices</p>{ready?.voices.length ? ready.voices.map(item => <Link prefetch={false} key={item.id} href={voiceUrl(item.id, context)} aria-current={voiceId === item.id ? "page" : undefined}>{item.name}</Link>) : <p className="sidebar-empty">{ready || status === "no_record_found" ? "No eligible voices" : "Voices unavailable"}</p>}
          <div className="page-nav"><p className="nav-label">On this page</p>{!voiceId ? <>{question ? <a href="#question">Research question</a> : null}<a href="#evidence">Reported evidence</a></> : null}<a href="#views">Attributed views</a><a href="#mentions">Mentions</a><a href="#sources">Source receipts</a></div>
          <div className="sidebar-end"><p>Evidence, in context.</p><small>Availability dates keep each edition grounded in what was known.</small></div>
        </nav>
        <main id="research" tabIndex={-1}>
          <div className="breadcrumb"><Link prefetch={false} href={companyUrl(context)}>Companies</Link><span>/</span>{voiceId ? <><Link prefetch={false} href={companyUrl(context)}>{companyName}</Link><span>/</span><span>Voice</span></> : <span>{companyName}</span>}</div>
          <div className="page-heading"><div><p className="eyebrow">{voiceId ? "Voice profile" : "Company overview"}{synthetic ? " · fictional" : ""}</p><h1>{voiceId ? voice?.name ?? "Voice unavailable" : companyName}</h1><p className="page-intro">{voiceId ? "What was said, what was only mentioned, and the sources behind each record." : "Inspect the reported figures. Read the voices and their sources in context."}</p></div><span className="coverage-badge">{ready ? ready.coverage.state === "partial" ? "Partial coverage" : "Covered evidence" : "Coverage unavailable"}</span></div>
          <form className="filters" method="get" action={`${process.env.MOUTHFOLIO_BASE_PATH ?? ""}${path}`} aria-label={synthetic ? "Demo examples" : "Research context"}>
            <input type="hidden" name="company" value={companyId}/><input type="hidden" name="window" value={window}/>{receiptId ? <input type="hidden" name="receipt" value={receiptId}/> : null}
            <label>Evidence cutoff{synthetic ? <select name="asof" defaultValue={asOf}>
              {![INITIAL_AS_OF,LATEST_AS_OF,"2026-10-25T12:00:00Z"].includes(asOf) ? <option value={asOf}>{asOf}</option> : null}
              <option value="2026-10-25T12:00:00Z">Before availability · Oct 25</option><option value={INITIAL_AS_OF}>Original edition · Oct 26</option><option value={LATEST_AS_OF}>Corrected edition · Oct 27</option>
            </select> : <input name="asof" defaultValue={asOf} aria-describedby="cutoff-help"/>}</label>
            {synthetic ? <label>Demo state<select name="state" defaultValue={state}><option value="available">Available</option><option value="revoked">Revoked</option><option value="unavailable">Service unavailable</option></select></label> : null}
            <button type="submit">Apply</button><p className="filter-note" id="cutoff-help">Publication window: {window === "all" ? "all dates" : "unsupported"}<br/>Availability cutoff in UTC</p>
          </form>
          {ready && (!voiceId || voice) ? <>
            <p className="summary-note" data-testid="commentary-coverage">{commentaryCoverage(views, mentions, ready.coverage.state === "partial")}</p>
            {!voiceId ? <>
              {question ? <section id="question" className="question-panel" aria-labelledby="question-title"><div className="section-kicker"><span className="eyebrow">The research question</span><span className="edition">Edition {question.edition_date}</span></div>
                <h2 id="question-title">{question.title}</h2><p className="finding">{question.finding}</p>
                {question.receipt_ids.map(id => <span className="inline-receipt" key={id}>{inspect(id, "Read question evidence")}</span>)}
              </section> : null}
              <section id="evidence" aria-labelledby="reported"><div className="section-heading"><div><p className="eyebrow">Business evidence</p><h2 id="reported">What has been reported?</h2></div><span className="muted">{synthetic ? "Fictional records" : "Eligible observations"}</span></div>
                {ready.observations.length ? <><p className="summary-note">Latest reporting date: {summary[0]?.period.end} · {summary.length} selected observations. All {ready.observations.length} records remain in the table.</p><div className="metric-grid">{summary.map(row => { const headline = headlineAmount(row.amount, row.unit); return <article className="metric-card" key={row.version_id}><p className="metric-label">{row.label}</p><p className="metric-value">{headline.text}</p><p className="metric-period">{row.period.label}</p>{headline.note ? <p className="summary-note">{headline.note}</p> : null}<small>{row.missing_reason ?? (row.revision_kind === "correction" ? "Corrected in the later edition" : "Reported observation")}</small>{inspect(row.receipt_id, `Inspect ${row.label.toLowerCase()}`)}</article>; })}</div>
                  <div className="table-scroll" tabIndex={0} role="region" aria-label="Reported evidence table"><table><caption>Reporting periods and source receipts · available by {dateLabel(asOf)}</caption><thead><tr><th scope="col">Measure / basis</th><th scope="col">Reported value</th><th scope="col">Period</th><th scope="col">Source</th></tr></thead><tbody>{ready.observations.map(row => <tr key={row.version_id}><th scope="row">{row.label}<small>{row.basis}</small></th><td className="amount">{formatAmount(row.amount,row.unit)}{row.missing_reason !== null ? <small>{row.missing_reason}</small> : null}{row.revision_kind === "correction" ? <small>Corrected</small> : null}</td><td>{row.period.label}<small>{row.period.start} – {row.period.end}</small></td><td>{inspect(row.receipt_id)}</td></tr>)}</tbody></table></div></> : <p className="empty-inline">No eligible financial observations are available. Missing evidence is not a zero value.</p>}
              </section>
            </> : <section className="voice-context"><p className="eyebrow">Subject in this research context</p><Link prefetch={false} className="subject-link" href={companyUrl(context)}>{companyName} <span aria-hidden="true">↗</span></Link><p className="muted">This profile covers only records linked to this company at the selected cutoff. It does not imply complete commentary coverage.</p></section>}
            <section id="views" aria-labelledby="views-title"><div className="section-heading"><div><p className="eyebrow">Commentary</p><h2 id="views-title">Attributed views</h2></div><span className="count">{views.length} {views.length === 1 ? "record" : "records"}</span></div><p className="section-intro">A stated perspective, kept with its speaker and original context.</p>
              {views.length ? views.map(view => <article className="commentary-record" key={view.version_id}><div className="record-meta"><Link prefetch={false} href={voiceUrl(view.voice_id,context)}>{ready.voices.find(item => item.id === view.voice_id)?.name}</Link><span>View · {dateLabel(view.published_at)}</span></div><p className="attributed-statement">{view.statement}</p><dl className="view-qualifiers"><dt>Conditions</dt><dd>{view.conditions ?? (synthetic ? "Not stated" : "See original source")}</dd><dt>Horizon</dt><dd>{view.horizon ?? (synthetic ? "Not stated" : "See original source")}</dd></dl><RecordTldr receipt={ready.receipts.find(item => item.id === view.receipt_id)}/>{inspect(view.receipt_id,"Inspect supporting receipt")}</article>) : <p className="empty-inline">No eligible attributed views for this context.</p>}
            </section>
            <section id="mentions" aria-labelledby="mentions-title"><div className="section-heading"><div><p className="eyebrow">Named references</p><h2 id="mentions-title">Mentions</h2></div><span className="count">{mentions.length} {mentions.length === 1 ? "record" : "records"}</span></div><p className="section-intro">The company was named. A mention alone does not establish a view or stance.</p>
              {mentions.length ? mentions.map(mention => <article className="mention-record" key={mention.version_id}><div><div className="record-meta"><Link prefetch={false} href={voiceUrl(mention.voice_id,context)}>{ready.voices.find(item => item.id === mention.voice_id)?.name}</Link><span>Mention · {dateLabel(mention.published_at)}</span></div><p>Named {companyName}</p><RecordTldr receipt={ready.receipts.find(item => item.id === mention.receipt_id)}/></div>{inspect(mention.receipt_id,"Inspect mention receipt")}</article>) : <p className="empty-inline">No eligible mentions for this context.</p>}
            </section>
            <section id="sources" aria-labelledby="sources-title"><div className="section-heading"><div><p className="eyebrow">Evidence library</p><h2 id="sources-title">Source receipts</h2></div></div>{ready.receipts.map(receipt => <article className="source-row" key={receipt.id}><div><h3>{receipt.title}</h3><p>Published {dateLabel(receipt.published_at)} · available {dateLabel(receipt.available_at)}</p></div>{inspect(receipt.id,"Open receipt")}</article>)}</section>
          </> : <section className="empty" role="status"><p className="eyebrow">Evidence status</p><h2>{ready && voiceId ? "Voice not found" : status === "no_record_found" ? "No record found" : status === "revoked" ? "Evidence revoked" : "Research unavailable"}</h2><p>{ready && voiceId ? "This voice has no eligible identity in the selected company context." : unavailableCopy[status]}</p>{!ready && status === "unavailable" ? <p><ReloadPage/></p> : null}{voiceId ? <Link prefetch={false} href={companyUrl(context)}>Return to company</Link> : null}</section>}
          <footer>{synthetic ? "Fictional research examples" : "ASOF Data research"} · evidence availability is distinct from publication time.<br/>Known as of {asOf} · no holdings or investor scores are inferred.</footer>
        </main>
      </div>
    </div>
    {receiptId ? <SourceInspector receipt={selected} requestedId={receiptId} closeUrl={href("")} observations={ready?.observations.filter(row => row.receipt_id === receiptId) ?? []} synthetic={synthetic}/> : null}
  </>;
}
