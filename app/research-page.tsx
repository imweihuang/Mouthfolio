import { ReceiptDismissalProvider } from "./components/receipt-dismissal";
import { ResearchLink } from "./components/research-link";
import { createDemoAdapter, DEMO_COMPANY, INITIAL_AS_OF, LATEST_AS_OF } from "../lib/demo-adapter";
import { commentaryCoverage, headlineAmount } from "../lib/observations";
import { overviewObservations } from "../lib/overview-observations";
import { readerMeasure, readerPeriod } from "../lib/reader-context";
import { formatAmount } from "../lib/contract";
import { readServiceResearch } from "../lib/server-research";
import { companySectionUrl, companyUrl, journeyUrl, latestUrl } from "../lib/navigation";
import type { CompanySection, JourneyContext } from "../lib/navigation";
import type { MouthfolioResearch } from "../lib/contract";
import { CommentaryFeed } from "./components/commentary-feed";
import { CompanyOrientation } from "./components/company-orientation";
import "./components/company-orientation.css";
import { FinancialComparisons } from "./components/financial-comparisons";
import "./components/financial-comparisons.css";
import { EvidenceContext, SourceInspector } from "./components/source-inspector";
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
  const requestedSection = single(params.section, "overview");
  const section: CompanySection = ["commentary", "financials", "sources"].includes(requestedSection) ? requestedSection as CompanySection : "overview";
  const context: JourneyContext = { companyId, asOf, window, state, receipt: receiptId, section: voiceId ? undefined : section,
    commentaryVoice: single(params.voice, "all"), commentaryKind: single(params.kind, "all"), commentaryOrder: single(params.order, "readable"),
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
  const summary = overviewObservations(ready?.observations ?? [], companyName);
  const sectionUrl = (target: CompanySection) => companySectionUrl(context, target);
  const selected = ready?.receipts.find(item => item.id === receiptId);
  // A failed request cannot establish receipt eligibility. Keep its URL for recovery
  // without opening a modal that makes the page recovery action inert.
  const showInspector = Boolean(receiptId) && (ready !== null || status !== "unavailable");
  const inspect = (id: string, label = "Inspect receipt", ariaLabel?: string) => <ResearchLink aria-label={ariaLabel} prefetch={false} scroll={false} data-receipt={id} href={href(id)}>{label} <span aria-hidden="true">↗</span></ResearchLink>;
  return <ReceiptDismissalProvider>
    <div className={`reader-shell${showInspector ? " has-inspector" : ""}`}>
      <a className="skip-link" href="#research">Skip to research</a>
      <div className="workspace">
        <nav className="sidebar" aria-label="Research navigation">
          <ResearchLink href={companyUrl(context)} className="brand">Mouthfolio<span className="brand-by">by ASOF</span></ResearchLink>
          <div className="sidebar-cutoff"><p>Evidence through<br/><time dateTime={asOf} title={asOf}>{dateLabel(asOf)} UTC</time></p><ResearchLink href={latestUrl(path, context)}>Latest evidence <span aria-hidden="true">↗</span></ResearchLink></div>
          <p className="nav-label">Company</p><ResearchLink className="nav-company" prefetch={false} href={companyUrl(context)}>{companyName}</ResearchLink>
          <div className="company-navigation"><ResearchLink href={sectionUrl("overview")} aria-current={!voiceId && section === "overview" ? "page" : undefined}>Overview</ResearchLink>
          <ResearchLink href={sectionUrl("commentary")} aria-current={!voiceId && section === "commentary" ? "page" : undefined}>Commentary</ResearchLink></div>
          {ready ? <div className="secondary-navigation">{ready.observations.length ? <ResearchLink href={sectionUrl("financials")} aria-current={!voiceId && section === "financials" ? "page" : undefined}>Financials</ResearchLink> : null}{sourceReceipts.length ? <ResearchLink href={sectionUrl("sources")} aria-current={!voiceId && section === "sources" ? "page" : undefined}>Sources</ResearchLink> : null}</div> : null}
          {voiceId ? <p className="sidebar-profile">Voice profile<br/><strong>{voice?.name ?? "Voice unavailable"}</strong></p> : null}
          <div className="sidebar-end"><p>{synthetic ? "Fictional demo" : "Early alpha"} · {ready?.coverage.state === "partial" ? "partial coverage" : "evidence in context"}</p><small>Availability and publication are distinct.</small></div>
        </nav>
        <main id="research" tabIndex={-1} className={`research-${voiceId ? "voice" : section}`}>
          {synthetic ? <div className="demo-notice"><strong>Fictional demo</strong><span>All companies, voices, values and source text are invented.</span></div> : null}
          <div className="breadcrumb"><ResearchLink prefetch={false} href={companyUrl(context)}>Companies</ResearchLink><span>/</span>{voiceId ? <><ResearchLink prefetch={false} href={companyUrl(context)}>{companyName}</ResearchLink><span>/</span><span>Voice</span></> : <span>{companyName}</span>}</div>
          <div className="page-heading"><div><p className="eyebrow">{voiceId ? "Voice profile" : section === "overview" ? "Company overview" : section === "commentary" ? "Commentary" : section === "financials" ? "Company financials" : "Company sources"}{synthetic ? " · fictional" : ""}</p><h1>{voiceId ? voice?.name ?? "Voice unavailable" : companyName}</h1><p className="page-intro">{voiceId ? "Follow the dated record, from an attributed view to its original source." : section === "overview" ? "Reported figures and the conversation around them." : section === "commentary" ? "Follow what people said back to the dated source." : "Reported evidence, with its periods and sources."}</p></div></div>
          {ready && !showInspector ? <EvidenceContext key={`${path}:${asOf}:${section}`} path={path} receipts={sourceReceipts} observations={voiceId ? [] : ready.observations} companyName={companyName} context={context} coverage={ready.coverage} synthetic={synthetic}/> : null}
          {ready && !voiceId && section === "overview" ? <CompanyOrientation profile={"context" in ready.company ? ready.company.context : undefined} context={context}/> : null}
          <details className="context-controls"><summary>Evidence available by: {dateLabel(asOf)} UTC <span>Change cutoff</span></summary>
          <form className="filters" method="get" action={`${process.env.MOUTHFOLIO_BASE_PATH ?? ""}${path}`} aria-label={synthetic ? "Demo examples" : "Research context"}>
            <input type="hidden" name="company" value={companyId}/>{!voiceId ? <input type="hidden" name="section" value={section}/> : null}<input type="hidden" name="window" value={window}/><input type="hidden" name="voice" value={context.commentaryVoice}/><input type="hidden" name="kind" value={context.commentaryKind}/><input type="hidden" name="order" value={context.commentaryOrder}/>{receiptId ? <input type="hidden" name="receipt" value={receiptId}/> : null}
            <label>Evidence cutoff{synthetic ? <select name="asof" defaultValue={asOf}>
              {![INITIAL_AS_OF,LATEST_AS_OF,"2026-10-25T12:00:00Z"].includes(asOf) ? <option value={asOf}>{asOf}</option> : null}
              <option value="2026-10-25T12:00:00Z">Before availability · Oct 25</option><option value={INITIAL_AS_OF}>Original edition · Oct 26</option><option value={LATEST_AS_OF}>Corrected edition · Oct 27</option>
            </select> : <input name="asof" defaultValue={asOf} aria-describedby="cutoff-help"/>}</label>
            {synthetic ? <label>Demo state<select name="state" defaultValue={state}><option value="available">Available</option><option value="revoked">Revoked</option><option value="unavailable">Service unavailable</option></select></label> : null}
            <button type="submit">Apply</button><ResearchLink href={latestUrl(path, context)}>Latest evidence</ResearchLink><p className="filter-note" id="cutoff-help">Publication window: {window === "all" ? "all dates" : "unsupported"}<br/>Availability cutoff in UTC</p>
          </form></details>
          {ready && (!voiceId || voice) ? <>
            {voiceId || section === "commentary" ? <p className="summary-note" data-testid="commentary-coverage">{commentaryCoverage(views, mentions, ready.coverage.state === "partial")}</p> : null}
            {!voiceId && (section === "overview" || section === "financials") ? <>
              {question && section === "overview" ? <details className="overview-question"><summary>{question.title}</summary><p>{question.finding}</p>{question.receipt_ids.map(id => <span className="inline-receipt" key={id}>{inspect(id, "Read question evidence")}</span>)}</details> : null}
              {question && section === "financials" ? <section id="question" className="question-panel" aria-labelledby="question-title"><div className="section-kicker"><span className="eyebrow">The research question</span><span className="edition">Edition {question.edition_date}</span></div>
                <h2 id="question-title">{question.title}</h2><p className="finding">{question.finding}</p>
                {question.receipt_ids.map(id => <span className="inline-receipt" key={id}>{inspect(id, "Read question evidence")}</span>)}
              </section> : null}
              <section id="evidence" aria-labelledby="reported"><div className="section-heading"><div><p className="eyebrow">Business evidence</p><h2 id="reported">Reported figures</h2></div>{synthetic ? <span className="muted">Fictional records</span> : null}</div>
                {ready.observations.length ? <><p className="summary-note">Periods shown per measure · latest available reported records</p><div className="metric-grid">{summary.map(row => { const headline = headlineAmount(row.amount, row.unit); return <article className="metric-card" key={row.version_id}><p className="metric-label" title={row.label}>{readerMeasure(row, companyName)}</p><p className="metric-value">{headline.text}</p><p className="metric-period" title={`${row.period.start} – ${row.period.end}`}>{readerPeriod(row)}</p>{headline.note ? <p className="summary-note">USD · rounded</p> : null}{row.missing_reason ? <small>{row.missing_reason}</small> : row.revision_kind === "correction" ? <small>Corrected in the later edition</small> : null}{inspect(row.receipt_id, "Source", `Inspect ${row.label.toLowerCase()}`)}</article>; })}</div>
                  {section === "financials" ? <details className="evidence-table" open><summary>Explore all {ready.observations.length} reported figures <span>Exact values, periods and sources</span></summary><div className="table-scroll" tabIndex={0} role="region" aria-label="Reported evidence table"><table><caption>Reporting periods and source receipts · available by {dateLabel(asOf)}</caption><thead><tr><th scope="col">Measure / basis</th><th scope="col">Reported value</th><th scope="col">Period</th><th scope="col">Source</th></tr></thead><tbody>{ready.observations.map(row => <tr key={row.version_id}><th scope="row">{row.label}<details className="basis-detail"><summary>Reporting basis</summary><small>{row.basis}</small></details></th><td className="amount">{formatAmount(row.amount,row.unit)}{row.missing_reason !== null ? <small>{row.missing_reason}</small> : null}{row.revision_kind === "correction" ? <small>Corrected</small> : null}</td><td>{row.period.label}<small>{row.period.start} – {row.period.end}</small></td><td>{inspect(row.receipt_id)}</td></tr>)}</tbody></table></div></details> : null}</> : <p className="empty-inline">No eligible financial observations are available. Missing evidence is not a zero value.</p>}
              </section>
              <FinancialComparisons receipts={ready.receipts} observations={ready.observations} companyName={companyName} context={context} compact={section === "overview"}/>
            </> : voiceId ? <section className="voice-context"><p className="eyebrow">Company context</p><ResearchLink prefetch={false} className="subject-link" href={companyUrl(context)}>{companyName} <span aria-hidden="true">↗</span></ResearchLink><p className="muted">Records about this company at the selected cutoff. Coverage is partial.</p></section> : null}
            {voiceId || section === "overview" || section === "commentary" ? <CommentaryFeed preview={!voiceId && section === "overview"} views={views} mentions={mentions} voices={ready.voices} receipts={ready.receipts} companyName={companyName} context={context} path={path} scopedVoiceId={voiceId}/> : null}
            {voiceId || section === "sources" ? <section id="sources" aria-labelledby="sources-title"><div className="section-heading"><div><p className="eyebrow">Evidence library</p><h2 id="sources-title">Source receipts</h2></div></div><details className="source-library" open><summary>Browse {sourceReceipts.length} source receipts</summary>{sourceReceipts.map(receipt => <article className="source-row" key={receipt.id}><div><h3>{receipt.title}</h3><p>Published {dateLabel(receipt.published_at)} · available {dateLabel(receipt.available_at)}</p></div>{inspect(receipt.id,"Open receipt")}</article>)}</details></section> : null}
          </> : <section className="empty" role="status"><p className="eyebrow">Evidence status</p><h2>{ready && voiceId ? "Voice not found" : status === "no_record_found" ? "No record found" : status === "revoked" ? "Evidence revoked" : "Research unavailable"}</h2><p>{ready && voiceId ? "This voice has no eligible identity in the selected company context." : unavailableCopy[status]}</p>{!ready && status === "unavailable" ? <p><ReloadPage/></p> : null}{voiceId ? <ResearchLink prefetch={false} href={companyUrl(context)}>Return to company</ResearchLink> : null}</section>}
          <footer>{ready?.coverage.state === "partial" ? <p className="coverage-note">Partial coverage. This page does not include every source or reaction.</p> : null}{synthetic ? "Fictional research examples" : "ASOF Data research"} · evidence availability is distinct from publication time.<br/>Evidence available by {dateLabel(asOf)} · no holdings or investor scores are inferred.</footer>
        </main>
      </div>
    </div>
    {showInspector ? <SourceInspector receipt={selected} requestedId={receiptId} closeUrl={href("")} observations={ready?.observations.filter(row => row.receipt_id === receiptId) ?? []} facts={ready && "context" in ready.company ? ready.company.context.facts.filter(fact => fact.receipt_id === receiptId) : []} synthetic={synthetic}/> : null}
  </ReceiptDismissalProvider>;
}
